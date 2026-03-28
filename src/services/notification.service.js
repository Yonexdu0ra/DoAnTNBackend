import prisma from '../configs/prismaClient.js'
import { pubsub, EVENTS } from '../configs/pubsub.js'

/**
 * Tạo notification và publish qua PubSub
 */
const createAndPublish = async (userId, title, content, type, refType = null, refId = null) => {
    const notification = await prisma.notification.create({
        data: { userId, title, content, type, refType, refId },
    })

    await pubsub.publish(EVENTS.NOTIFICATION_RECEIVED, {
        userId, title, content, type, refType, refId,
    })

    return notification
}

export default { createAndPublish }
