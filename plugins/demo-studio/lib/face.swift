// Where is the face? `swift face.swift <image>` prints the largest face's centre and size as
// fractions of the image, top-left origin: `cx cy w h`. Uses macOS Vision, no install.
import Foundation
import Vision
import AppKit

let path = CommandLine.arguments[1]
guard let img = NSImage(contentsOfFile: path),
      let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
  FileHandle.standardError.write("cannot read \(path)\n".data(using: .utf8)!); exit(1)
}
let req = VNDetectFaceRectanglesRequest()
try VNImageRequestHandler(cgImage: cg).perform([req])
guard let f = (req.results ?? []).max(by: { $0.boundingBox.width < $1.boundingBox.width }) else {
  FileHandle.standardError.write("no face in \(path)\n".data(using: .utf8)!); exit(2)
}
let b = f.boundingBox
print(String(format: "%.4f %.4f %.4f %.4f", b.midX, 1 - b.midY, b.width, b.height))
