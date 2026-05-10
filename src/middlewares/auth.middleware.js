
import { verifyAccessTokenDetailed } from "../utils/token.js";
import { createUnauthenticatedGraphQLError } from "../utils/graphqlAuthError.js";
import getClientIp from "../utils/getClientIp.js";

export const requireToken = async (req, res, next) => {
    try {
        const headers = req.headers;
        const cookies = req.cookies;
        // console.log(headers);
        // console.log(headers.authorization?.replace('Bearer ', ''));

        const token = headers.authorization?.replace('Bearer ', '') || cookies.access_token;

        if (!token) throw new Error('TOKEN MISSING')
        const { decoded, reason } = verifyAccessTokenDetailed(token);

        const ip = getClientIp(req)
        req.clientIp = ip;
        if (!decoded) throw new Error(reason)
        delete decoded.exp
        delete decoded.iat

        req.user = decoded;
        return next();

    } catch (error) {
        return res.status(401).json({
            success: false,
            message: error.message,
            data: null
        })

    }
}


const requireRole = (role) => {
    return (req, res, next) => {
        try {
            const headers = req.headers;
            const cookies = req.cookies;
            // console.log(headers);
            // console.log(headers.authorization?.replace('Bearer ', ''));

            const token = cookies.access_token || headers.authorization?.replace('Bearer ', '');
            if (!token) throw createUnauthenticatedGraphQLError('TOKEN MISSING')
            const { decoded, reason } = verifyAccessTokenDetailed(token);
            if (!decoded) throw createUnauthenticatedGraphQLError(reason)
            req.user = decoded;
            next();

        } catch (error) {
            return res.status(error?.extensions?.http?.status || 401).json(error)
        }
    }
}