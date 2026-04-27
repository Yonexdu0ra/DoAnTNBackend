import { getDistance } from 'geolib'

/**
 * Tính khoảng cách (mét) giữa 2 tọa độ GPS.
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
    return getDistance(
        { latitude: lat1, longitude: lon1 },
        { latitude: lat2, longitude: lon2 }
    )
}
