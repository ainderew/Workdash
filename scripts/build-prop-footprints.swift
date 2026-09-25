// Measures which part of each prop tile is actually drawn, so props block
// the player where their art is instead of across the whole 32x32 tile.
// Measured here, ahead of time: reading pixels from the 5632x14496 exterior
// tileset in the browser stalls the game. Rerun whenever map1.json changes:
//
//   swift scripts/build-prop-footprints.swift public/assets/map1.json \
//       public/assets/tile-sets src/game/player/propFootprints.json
//
// Output: { "<gid>": [left, top, right, bottom] in tile px, or null if the
// tile draws nothing }, for every tile on the prop collision layers.
// macOS only (CoreGraphics / ImageIO).
import CoreGraphics
import Foundation
import ImageIO

let propLayers = ["Furniture", "Trees", "Trees2"]
let minAlpha: UInt8 = 128
let fileFor = [
    "Exterior": "Modern_Exteriors_Complete_Tileset_32x32.png",
    "Interior_2": "Room_Builder_32x32.png",
    "Office": "Modern_Office_Shadowless_32x32.png",
]

let args = CommandLine.arguments
guard args.count == 4 else {
    print("usage: build-prop-footprints.swift <map.json> <tilesetDir> <out.json>")
    exit(1)
}
let map = try! JSONSerialization.jsonObject(with: Data(contentsOf: URL(fileURLWithPath: args[1]))) as! [String: Any]

struct Tileset { let firstgid: Int; let columns: Int; let tileW: Int; let tileH: Int; let file: String }
let tilesets: [Tileset] = (map["tilesets"] as! [[String: Any]]).map { ts in
    let name = ts["name"] as! String
    let file = fileFor[name] ?? name.replacingOccurrences(of: "Interior_Tile_", with: "Interiors_32x32_part_") + ".png"
    return Tileset(firstgid: ts["firstgid"] as! Int, columns: ts["columns"] as! Int,
                   tileW: ts["tilewidth"] as! Int, tileH: ts["tileheight"] as! Int, file: file)
}.sorted { $0.firstgid < $1.firstgid }

var gids = Set<Int>()
for layer in map["layers"] as! [[String: Any]] where propLayers.contains(layer["name"] as? String ?? "") {
    for raw in layer["data"] as! [Int] where raw != 0 { gids.insert(raw & 0x1FFFFFFF) }
}

var images: [String: CGImage] = [:]
func image(_ file: String) -> CGImage {
    if let hit = images[file] { return hit }
    let url = URL(fileURLWithPath: "\(args[2])/\(file)") as CFURL
    guard let src = CGImageSourceCreateWithURL(url, nil), let img = CGImageSourceCreateImageAtIndex(src, 0, nil) else {
        fatalError("missing tileset image \(file)")
    }
    images[file] = img
    return img
}

var out: [String: Any] = [:]
for gid in gids.sorted() {
    guard let ts = tilesets.last(where: { $0.firstgid <= gid }) else { continue }
    let local = gid - ts.firstgid
    let (w, h) = (ts.tileW, ts.tileH)
    guard let tile = image(ts.file).cropping(to: CGRect(x: (local % ts.columns) * w, y: (local / ts.columns) * h, width: w, height: h)) else { continue }
    var px = [UInt8](repeating: 0, count: w * h * 4)
    let ctx = CGContext(data: &px, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4,
                        space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
    ctx.draw(tile, in: CGRect(x: 0, y: 0, width: w, height: h))
    var (l, t, r, b) = (w, h, 0, 0)
    for y in 0..<h { for x in 0..<w where px[(y * w + x) * 4 + 3] >= minAlpha {
        l = min(l, x); r = max(r, x + 1); t = min(t, y); b = max(b, y + 1)
    } }
    out[String(gid)] = r == 0 ? NSNull() : [l, t, r, b]
}

let json = try! JSONSerialization.data(withJSONObject: out, options: [.sortedKeys])
try! json.write(to: URL(fileURLWithPath: args[3]))
print("wrote \(args[3]): \(out.count) tiles")
