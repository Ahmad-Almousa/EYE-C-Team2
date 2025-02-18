import { Redis } from '@upstash/redis';

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_URL,
    token: process.env.UPSTASH_REDIS_TOKEN,
});

export default async function handler(req, res) {
    if (req.method === 'GET') {
        try {
            const data = await redis.hgetall('state') || {};
            res.status(200).json({ state: data.state || null, checkboxState: data.checkboxState || null });
        } catch (error) {
            res.status(500).json({ error: 'Failed to retrieve state from Redis' });
        }
    } else if (req.method === 'PUT') {
        try {
            const { state, checkboxState } = req.body;
            const updates = {};

            if (state !== undefined) updates.state = state;
            if (checkboxState !== undefined) updates.checkboxState = checkboxState;

            if (Object.keys(updates).length > 0) {
                await redis.hset('state', updates);
            }

            res.status(200).json(updates);
        } catch (error) {
            res.status(500).json({ error: 'Failed to update state in Redis' });
        }
    } else {
        res.setHeader('Allow', ['GET', 'PUT']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}