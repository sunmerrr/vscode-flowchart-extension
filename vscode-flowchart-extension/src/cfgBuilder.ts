
import Parser from 'web-tree-sitter';

export enum CFGNodeType {
    Entry = "Entry",
    Exit = "Exit",
    Statement = "Statement",
    Condition = "Condition",
    Block = "Block",
    Merge = "Merge", // New node type for merging control flow (e.g., after if-else)
}

export interface CFGNode {
    id: string;
    type: CFGNodeType;
    text: string;
    range: { start: { row: number, column: number }, end: { row: number, column: number } }; // Tree-sitter uses row/column
    children?: CFGNode[]; // For nested blocks/statements
    treeSitterNode?: Parser.SyntaxNode; // Reference to the original Tree-sitter node for debugging/context
}

export interface CFGEdge {
    from: string;
    to: string;
    label?: string;
}

export interface ControlFlowGraph {
    nodes: CFGNode[];
    edges: CFGEdge[];
    entryNodeId: string;
    exitNodeId: string;
}

let globalNodeIdCounter = 0; // Use a global counter for unique IDs across all nodes

function createCfgNode(
    type: CFGNodeType,
    tsNode: Parser.SyntaxNode,
    text: string = tsNode.text
): CFGNode {
    return {
        id: `node-${globalNodeIdCounter++}`,
        type,
        text,
        range: {
            start: { row: tsNode.startPosition.row, column: tsNode.startPosition.column },
            end: { row: tsNode.endPosition.row, column: tsNode.endPosition.column }
        },
        treeSitterNode: tsNode
    };
}

/**
 * Tree-sitter AST(CST)를 탐색하여 Control Flow Graph (CFG)를 구축합니다.
 * MVP에서는 if-else 문과 기본적인 Statement 노드에 집중합니다.
 *
 * @param tree Tree-sitter의 파싱된 트리
 * @returns 구축된 ControlFlowGraph 객체
 */
export function buildControlFlowGraph(tree: Parser.Tree): ControlFlowGraph {
    globalNodeIdCounter = 0; // Reset for each new graph
    const nodes: CFGNode[] = [];
    const edges: CFGEdge[] = [];

    const entryNode = createCfgNode(CFGNodeType.Entry, tree.rootNode, "Entry");
    nodes.push(entryNode);
    let lastNodeInCurrentPath: CFGNode = entryNode;

    // Helper to process a block of statements (e.g., if block, else block, function body)
    const processStatementList = (tsNode: Parser.SyntaxNode, prevCfgNode: CFGNode): CFGNode => {
        let currentCfgNode = prevCfgNode;
        for (const child of tsNode.children) {
            // Only process named nodes that are not comments
            if (child.isNamed() && child.type !== 'comment') {
                currentCfgNode = processTreeNode(child, currentCfgNode);
            }
        }
        return currentCfgNode;
    };


    const processTreeNode = (tsNode: Parser.SyntaxNode, prevCfgNode: CFGNode): CFGNode => {
        let currentNodeForSubsequentConnections = prevCfgNode;

        if (tsNode.type === 'if_statement') {
            const conditionNode = tsNode.childForFieldName('condition');
            const consequenceNode = tsNode.childForFieldName('consequence'); // 'then' block
            const alternativeNode = tsNode.childForFieldName('alternative'); // 'else' block

            if (conditionNode && consequenceNode) {
                const cfgConditionNode = createCfgNode(CFGNodeType.Condition, conditionNode);
                nodes.push(cfgConditionNode);
                edges.push({ from: currentNodeForSubsequentConnections.id, to: cfgConditionNode.id, label: 'guard' });

                const mergeNode = createCfgNode(CFGNodeType.Merge, tsNode, 'Merge');
                nodes.push(mergeNode);

                // Process 'true' branch (consequence)
                const ifBlockEntryNode = createCfgNode(CFGNodeType.Block, consequenceNode, 'IF_Block');
                nodes.push(ifBlockEntryNode);
                edges.push({ from: cfgConditionNode.id, to: ifBlockEntryNode.id, label: 'true' });
                const lastInIfBlock = processStatementList(consequenceNode, ifBlockEntryNode);
                edges.push({ from: lastInIfBlock.id, to: mergeNode.id });

                // Process 'false' branch (alternative or direct to merge)
                if (alternativeNode) {
                    const elseBlockEntryNode = createCfgNode(CFGNodeType.Block, alternativeNode, 'ELSE_Block');
                    nodes.push(elseBlockEntryNode);
                    edges.push({ from: cfgConditionNode.id, to: elseBlockEntryNode.id, label: 'false' });
                    const lastInElseBlock = processStatementList(alternativeNode, elseBlockEntryNode);
                    edges.push({ from: lastInElseBlock.id, to: mergeNode.id });
                } else {
                    // No else block, false path goes directly to merge
                    edges.push({ from: cfgConditionNode.id, to: mergeNode.id, label: 'false' });
                }

                currentNodeForSubsequentConnections = mergeNode; // The merge node is the new continuation point

            }
        } else if (tsNode.type === 'expression_statement' || tsNode.type === 'variable_declaration' || tsNode.type === 'return_statement') {
            // Basic statements
            const cfgStatementNode = createCfgNode(CFGNodeType.Statement, tsNode);
            nodes.push(cfgStatementNode);
            edges.push({ from: currentNodeForSubsequentConnections.id, to: cfgStatementNode.id });
            currentNodeForSubsequentConnections = cfgStatementNode;
        } else if (tsNode.type === 'statement_block' || tsNode.type === 'program' || tsNode.type === 'function_declaration') {
            // Recurse into blocks/function bodies, but don't create a separate CFG node for them here
            // Their contents will be processed, and they'll handle their own prevCfgNode connections
            currentNodeForSubsequentConnections = processStatementList(tsNode, currentNodeForSubsequentConnections);
        } else {
            // For other unhandled node types, just traverse their children
            for (const child of tsNode.children) {
                if (child.isNamed() && child.type !== 'comment') {
                    currentNodeForSubsequentConnections = processTreeNode(child, currentNodeForSubsequentConnections);
                }
            }
        }

        return currentNodeForSubsequentConnections;
    };

    // Start processing from the root of the AST
    lastNodeInCurrentPath = processStatementList(tree.rootNode, entryNode);

    const exitNode = createCfgNode(CFGNodeType.Exit, tree.rootNode, "Exit");
    nodes.push(exitNode);
    edges.push({ from: lastNodeInCurrentPath.id, to: exitNode.id });

    return {
        nodes,
        edges,
        entryNodeId: entryNode.id,
        exitNodeId: exitNode.id
    };
}

