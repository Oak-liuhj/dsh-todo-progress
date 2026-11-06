/** 会话业务操作：新建空白会话时继承工作区；无工作区则继承工作目录。 */
export async function createBlankSession(ctx, session) {
    const cwd = ctx.sessionProjections.stateOf(session, 'workingDirectory');
    const workspace = ctx.workspaceRegistry.list().find(w => w.sessionIds.includes(session.id));
    const options = workspace ? {workspaceId: workspace.id} : typeof cwd === 'string' ? {cwd} : {};
    const created = await ctx.sessionController.create(options);
    return {newSessionId: created.sessionId};
}
