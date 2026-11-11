/** 维护插件实际读取的宿主面。变更触发人工复验，不等同于运行时兼容认证。 */
import ts from 'typescript';

export const contracts = {
    'dsh-client-ui-renderer': {SlotRegistry: ['inject', 'register', 'entriesOfSlot', 'subscribe']},
    'dsh-client-ui-conversation': {
        SlotMap: [
            ['conversation.session.header.corner', 'kind', 'single'],
            ['conversation.session.header.corner', 'scope', 'session'],
            ['conversation.input.dock', 'kind', 'list'],
            ['conversation.input.dock', 'scope', 'session'],
        ],
    },
    'dsh-client-ui-sidebar-right': {
        SlotMap: [
            ['sidebar.right.pane.tab', 'kind', 'keyed'],
            ['sidebar.right.pane.tab', 'scope', 'session'],
            ['sidebar.right.pane.tab.title', 'kind', 'keyed'],
        ],
        SidebarRightTabRegistry: ['register'],
        SidebarRightController: ['openTab'],
        SidebarRightTabDefinition: ['id', 'kind', 'priority', 'keepMounted', 'title', 'guide'],
        SidebarRightTabInfo: [['sidebar', 'fullscreen'], ['panel', 'id'], ['tab', 'visible']],
    },
    'dsh-client-ui-layout': {LayoutInfo: ['rightbar', 'viewportWidth'], LayoutActions: ['setRightbar']},
    'dsh-client-ui-workspace': {UiWorkspace: ['openSession']},
    'dsh-client-ui-session': {SessionStandardProps: ['useProjection']},
    'dsh-client-connection': {HostConnectionHandle: ['admit']},
    'dsh-api-session-controller': {SessionController: ['create']},
    'dsh-session-projection': {SessionProjectionRegistry: ['stateOf']},
    'dsh-workspace': {WorkspaceRegistry: ['list']},
};

function members(node) {
    if (!node) return [];
    if (node.members) return [...node.members];
    if (ts.isTypeAliasDeclaration(node)) return members(node.type);
    if (ts.isIntersectionTypeNode(node)) return node.types.flatMap(members);
    return [];
}

/** 用 AST 检查声明结构，注释或同名字符串不能冒充接口。只做结构探测，不做完整类型检查。 */
export function checkDeclarations(sources, required) {
    const owners = new Map();
    for (const [file, text] of Object.entries(sources)) {
        const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
        const visit = node => {
            if ((ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) && node.name) {
                const name = node.name.text;
                owners.set(name, [...(owners.get(name) || []), ...members(node)]);
            }
            ts.forEachChild(node, visit);
        };
        visit(source);
    }
    const results = [];
    for (const [owner, fields] of Object.entries(required)) {
        for (const field of fields) {
            const parts = Array.isArray(field) ? field : [field];
            let candidates = owners.get(owner) || [], found;
            // 三段形式是 SlotMap 的 slot -> kind/scope -> 字面量。
            const path = parts.length === 3 ? parts.slice(0, 2) : parts;
            for (const part of path) {
                found = candidates.find(member => member.name?.text === part);
                candidates = members(found?.type);
                if (!found) break;
            }
            const expected = parts.length === 3 ? parts[2] : undefined;
            const literal = found?.type && ts.isLiteralTypeNode(found.type) ? found.type.literal.text : undefined;
            const ok = !!found && (expected === undefined || literal === expected);
            results.push({contract: `${owner}.${path.join('.')}`, ok, ...(expected ? {expected, actual: literal ?? null} : {})});
        }
    }
    return results;
}
