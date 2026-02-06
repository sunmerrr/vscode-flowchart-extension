import Parser from 'web-tree-sitter';

// CFG 노드의 종류를 정의합니다.
export enum CFGNodeType {
    Entry = "Entry",         // 함수/블록의 시작점
    Exit = "Exit",           // 함수/블록의 종료점
    Statement = "Statement", // 일반적인 코드 문 (할당, 함수 호출 등)
    Condition = "Condition", // 조건식 (if, switch)
    Block = "Block",         // 코드 블록 (if/else/switch의 본문)
    Loop = "Loop",           // 루프의 시작/조건 (MVP 이후)
    FunctionCall = "FunctionCall", // 함수 호출 (MVP 이후)
}

// CFG 노드를 표현하는 인터페이스
export interface CFGNode {
    id: string; // 고유 ID (예: UUID 또는 노드 타입 + 라인 번호)
    type: CFGNodeType;
    text: string; // 해당 노드에 해당하는 코드 스니펫
    range: { start: { line: number, character: number }, end: { line: number, character: number } }; // 코드 위치
    children?: CFGNode[]; // 중첩된 구조를 위한 자식 노드 (예: Block 내 Statement)
}

// CFG 엣지(Edge)를 표현하는 인터페이스
export interface CFGEdge {
    from: string; // 시작 노드 ID
    to: string;   // 도착 노드 ID
    label?: string; // 엣지에 대한 설명 (예: "true", "false", "default")
}

// 최종 CFG 구조
export interface ControlFlowGraph {
    nodes: CFGNode[];
    edges: CFGEdge[];
    entryNodeId: string; // 시작 노드의 ID
    exitNodeId: string;  // 종료 노드의 ID
}

/**
 * Tree-sitter AST(CST)를 탐색하여 Control Flow Graph (CFG)를 구축합니다.
 * @param tree Tree-sitter의 파싱된 트리
 * @returns 구축된 ControlFlowGraph 객체
 */
export function buildControlFlowGraph(tree: Parser.Tree): ControlFlowGraph {
    const nodes: CFGNode[] = [];
    const edges: CFGEdge[] = [];
    let nodeIdCounter = 0; // Simple counter for unique IDs

    const entryNode: CFGNode = {
        id: `node-${nodeIdCounter++}`,
        type: CFGNodeType.Entry,
        text: "Entry",
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } } // Placeholder
    };
    nodes.push(entryNode);

    // Placeholder for actual AST traversal and CFG construction logic
    // This will be implemented in subsequent steps.

    const exitNode: CFGNode = {
        id: `node-${nodeIdCounter++}`,
        type: CFGNodeType.Exit,
        text: "Exit",
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } } // Placeholder
    };
    nodes.push(exitNode);

    // Connect entry to exit for now (placeholder)
    edges.push({ from: entryNode.id, to: exitNode.id });


    console.log("Building CFG (placeholder logic for now)...", tree.rootNode.toString());

    return {
        nodes,
        edges,
        entryNodeId: entryNode.id,
        exitNodeId: exitNode.id
    };
}
