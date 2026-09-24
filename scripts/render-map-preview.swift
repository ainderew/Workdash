// Renders the world map (Tiled JSON) to a PNG, drawing layers in the same
// order as MainMap.createLayers. Used for the world loading screen's map
// preview, which must be regenerated whenever map1.json changes:
//
//   swift scripts/render-map-preview.swift public/assets/map1.json \
//       public/assets/tile-sets /tmp/world-map.png 0.25 127 110
//   cwebp -q 78 -m 6 /tmp/world-map.png -o /tmp/world-map.webp
//   # name it public/assets/world-map-preview.<first 8 of sha256>.webp and
//   # update WORLD_MAP_PREVIEW in src/common/components/WorldLoading/places.ts
//
// Args: <map.json> <tilesetDir> <out.png> [scale=0.25] [widthTiles] [heightTiles]
// Width/height crop to the playable world bounds (MainMap.worldBounds / 32).
// macOS only (CoreGraphics / ImageIO).
import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

let args = CommandLine.arguments
guard args.count >= 4 else {
    print("usage: render-map-preview.swift <map.json> <tilesetDir> <out.png> [scale] [widthTiles] [heightTiles]")
    exit(1)
}
let map = try! JSONSerialization.jsonObject(with: Data(contentsOf: URL(fileURLWithPath: args[1]))) as! [String: Any]
let tilesetDir = args[2]
let scale = args.count > 4 ? Double(args[4])! : 0.25
let mapW = map["width"] as! Int
let tile = 32
let cols = args.count > 5 ? Int(args[5])! : mapW
let rows = args.count > 6 ? Int(args[6])! : (map["height"] as! Int)

let order = ["Floor", "Rugs", "Wall", "WallDecoration", "Furniture", "FurnitureDecoration", "Buildings", "Trees2", "Trees"]
let fileFor = [
    "Exterior": "Modern_Exteriors_Complete_Tileset_32x32.png",
    "Interior_2": "Room_Builder_32x32.png",
    "Office": "Modern_Office_Shadowless_32x32.png",
]

struct Tileset { let firstgid: Int; let columns: Int; let image: CGImage }
let tilesets: [Tileset] = (map["tilesets"] as! [[String: Any]]).map { ts in
    let name = ts["name"] as! String
    let file = fileFor[name] ?? name.replacingOccurrences(of: "Interior_Tile_", with: "Interiors_32x32_part_") + ".png"
    let url = URL(fileURLWithPath: "\(tilesetDir)/\(file)") as CFURL
    guard let src = CGImageSourceCreateWithURL(url, nil), let img = CGImageSourceCreateImageAtIndex(src, 0, nil) else {
        fatalError("missing tileset image \(file)")
    }
    return Tileset(firstgid: ts["firstgid"] as! Int, columns: ts["columns"] as! Int, image: img)
}.sorted { $0.firstgid < $1.firstgid }

var cache: [Int: CGImage] = [:]
func tileImage(_ gid: Int) -> CGImage? {
    if let hit = cache[gid] { return hit }
    guard let ts = tilesets.last(where: { $0.firstgid <= gid }) else { return nil }
    let local = gid - ts.firstgid
    let img = ts.image.cropping(to: CGRect(x: (local % ts.columns) * tile, y: (local / ts.columns) * tile, width: tile, height: tile))
    cache[gid] = img
    return img
}

let outW = Int(Double(cols * tile) * scale), outH = Int(Double(rows * tile) * scale)
let ctx = CGContext(data: nil, width: outW, height: outH, bitsPerComponent: 8, bytesPerRow: 0,
                    space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
ctx.interpolationQuality = .none
let s = CGFloat(tile) * CGFloat(scale)
let layers = Dictionary(uniqueKeysWithValues: (map["layers"] as! [[String: Any]])
    .filter { $0["type"] as? String == "tilelayer" }
    .map { ($0["name"] as! String, $0["data"] as! [Int]) })

for name in order {
    guard let cells = layers[name] else { continue }
    for ty in 0..<rows {
        for tx in 0..<cols {
            let raw = cells[ty * mapW + tx]
            guard raw != 0, let img = tileImage(raw & 0x1FFFFFFF) else { continue }
            let x = CGFloat(tx) * s
            let y = CGFloat(outH) - CGFloat(ty + 1) * s
            ctx.saveGState()
            // Tiled flip flags: horizontal, vertical
            if raw & Int(0x80000000) != 0 { ctx.translateBy(x: 2 * x + s, y: 0); ctx.scaleBy(x: -1, y: 1) }
            if raw & 0x40000000 != 0 { ctx.translateBy(x: 0, y: 2 * y + s); ctx.scaleBy(x: 1, y: -1) }
            ctx.draw(img, in: CGRect(x: x, y: y, width: s, height: s))
            ctx.restoreGState()
        }
    }
}

let dest = CGImageDestinationCreateWithURL(URL(fileURLWithPath: args[3]) as CFURL, UTType.png.identifier as CFString, 1, nil)!
CGImageDestinationAddImage(dest, ctx.makeImage()!, nil)
CGImageDestinationFinalize(dest)
print("wrote \(args[3]) \(outW)x\(outH)")
