/** HTTP 边界：认证、同源、大小与参数校验；通过后才允许执行会话操作。 */
import {createBlankSession} from './session-actions.js';

export async function handleTaskRequest(req, res) {
    const send = (status, value) => {
        res.writeHead(status, {'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store'});
        res.end(JSON.stringify(value));
    };
    try {
        const admission = this.ctx.connection.admit(req);
        if ('rejection' in admission) return send(admission.rejection, {error: 'unauthorized'});
        if (admission.peer.principal?.kind !== 'owner') return send(403, {error: 'owner-required'});
        const url = new URL(req.url, 'http://localhost');
        if (req.method === 'GET') {
            const id = url.searchParams.get('session');
            if (!id || !/^[\w-]{1,160}$/.test(id)) return send(400, {error: 'invalid-session'});
            return send(200, {available: !!this.rollover, ...await this.rollover?.info(id)});
        }
        if (req.method !== 'POST') return send(405, {error: 'method-not-allowed'});
        if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) return send(415, {error: 'json-required'});
        if (req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) return send(403, {error: 'origin-mismatch'});
        let body = '';
        for await (const chunk of req) {
            body += chunk;
            if (Buffer.byteLength(body) > 4096) return send(413, {error: 'too-large'});
        }
        let input;
        try { input = JSON.parse(body); } catch { return send(400, {error: 'invalid-json'}); }
        if (!input || typeof input !== 'object' || !/^[\w-]{1,160}$/.test(input.sessionId || '')) return send(400, {error: 'invalid-session'});
        if (!['rollover', 'new'].includes(input.action)) return send(400, {error: 'invalid-action'});
        const session = this.ctx.sessions.get(input.sessionId);
        if (!session) return send(404, {error: 'session-unavailable'});
        if (input.action === 'rollover') {
            if (!this.rollover) return send(503, {error: 'rollover-unavailable'});
            const result = await this.rollover.rollover(input.sessionId);
            return send(result.status === 'rolled-over' ? 200 : 409, result);
        }
        return send(200, await createBlankSession(this.ctx, session));
    } catch (error) {
        return send(500, {error: 'operation-failed', message: String(error?.message || error)});
    }
}
