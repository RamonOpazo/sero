interface Coords { x: number, y: number, width: number, height: number }
interface PageDimension { width: number, height: number }

export const pixelToNormalized = (coords: Coords, pageDimension?: PageDimension) => {
    if (!pageDimension) return coords
    return {
        x: coords.x / pageDimension.width,
        y: coords.y / pageDimension.height,
        width: coords.width / pageDimension.width,
        height: coords.height / pageDimension.height
    }
}

export const normalizedToPixel = (coords: Coords, pageDimension?: PageDimension) => {
    if (!pageDimension) return coords
    return {
        x: coords.x * pageDimension.width,
        y: coords.y * pageDimension.height,
        width: coords.width * pageDimension.width,
        height: coords.height * pageDimension.height
    }
}