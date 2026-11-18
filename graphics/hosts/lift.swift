// Cuts the person out of a photo (macOS Vision subject lifting) → transparent PNG.
//   swift graphics/hosts/lift.swift graphics/hosts/kaja.jpg graphics/hosts/kaja-cutout.png
import Vision
import CoreImage
let args = CommandLine.arguments
let input = CIImage(contentsOf: URL(fileURLWithPath: args[1]))!
let req = VNGenerateForegroundInstanceMaskRequest()
let handler = VNImageRequestHandler(ciImage: input)
try handler.perform([req])
guard let obs = req.results?.first else { print("no subject found"); exit(1) }
let buf = try obs.generateMaskedImage(ofInstances: obs.allInstances, from: handler, croppedToInstancesExtent: false)
try CIContext().writePNGRepresentation(of: CIImage(cvPixelBuffer: buf), to: URL(fileURLWithPath: args[2]), format: .RGBA8, colorSpace: CGColorSpaceCreateDeviceRGB())
print("ok")
