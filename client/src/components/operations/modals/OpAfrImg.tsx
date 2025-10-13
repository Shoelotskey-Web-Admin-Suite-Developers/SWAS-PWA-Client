import React, { useState, useRef } from "react";
import Webcam from "react-webcam";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { uploadToCloudinary } from "@/utils/api/cloudinaryUpload";
import { saveLineItemImage } from "@/utils/api/editImageLink";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { processImageToJpg, validateImageFile } from "@/utils/imageProcessing";

interface OpAfrImgProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lineItemId: string | null;
  onImageUploaded?: (lineItemId: string, url: string) => void;
}

export default function OpAfrImg({ open, onOpenChange, lineItemId, onImageUploaded }: OpAfrImgProps) {
  const [step, setStep] = useState<"choose" | "upload" | "camera">("choose");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [cameraImg, setCameraImg] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const webcamRef = useRef<Webcam>(null);

  const handleChooseLocal = () => setStep("upload");
  const handleChooseCamera = () => setStep("camera");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (e.target.files && e.target.files[0]) {
        const raw = e.target.files[0];
        // Preliminary size check: 5 MB max before processing
        if (raw.size > 5 * 1024 * 1024) {
          toast.error('File too large. Please select an image under 5 MB.');
          return;
        }

        const processed = await processImageToJpg(raw, {
          width: 300,
          height: 300,
          mime: 'image/jpeg',
          quality: 0.9,
          maxBytes: 300 * 1024 * 1024,
          fileName: 'after.jpg',
        });
        const check = await validateImageFile(processed, 300, 300, 'image/jpeg', 300 * 1024 * 1024);
        if (!check.valid) {
          toast.error(`Image invalid: ${check.reasons.join('; ')}`);
          return;
        }
        setSelectedFile(processed);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(URL.createObjectURL(processed));
        toast.success('After image processed: 300x300 JPG and under 300 MB');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to process image');
    }
  };

  const handleCapture = async () => {
    try {
      const imageSrc = webcamRef.current?.getScreenshot();
      if (imageSrc) {
        setCameraImg(imageSrc);
        // Preliminary size check for camera capture: ensure data URL blob <= 5 MB
        const blob = await (await fetch(imageSrc)).blob();
        if (blob.size > 5 * 1024 * 1024) {
          toast.error('Captured image is larger than 5 MB. Please retake a smaller image.');
          return;
        }

        const processed = await processImageToJpg(blob, {
          width: 300,
          height: 300,
          mime: 'image/jpeg',
          quality: 0.9,
          maxBytes: 300 * 1024 * 1024,
          fileName: 'after.jpg',
        });
        const check = await validateImageFile(processed, 300, 300, 'image/jpeg', 300 * 1024 * 1024);
        if (!check.valid) {
          toast.error(`Image invalid: ${check.reasons.join('; ')}`);
          return;
        }
        setSelectedFile(processed);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(URL.createObjectURL(processed));
        toast.success('After image processed: 300x300 JPG and under 300 MB');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to capture/process image');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !lineItemId) return;
    // already validated upon selection/capture
    const url = await uploadToCloudinary(selectedFile);
    if (!url) {
      toast.error("Image upload failed.");
      return;
    }
    const success = await saveLineItemImage(lineItemId, "after", url); // <-- "after" type
    if (!success) {
      toast.error("Failed to save image link to DB.");
      return;
    }
    toast.success("After image uploaded and saved successfully!");
    if (onImageUploaded) {
      onImageUploaded(lineItemId, url);
    }
    onOpenChange(false);
    setStep("choose");
    setSelectedFile(null);
    setCameraImg(null);
  };

  const handleCancel = () => {
    onOpenChange(false);
    setStep("choose");
    setSelectedFile(null);
    setCameraImg(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            <h2 className="text-lg font-bold">Upload After Image</h2>
          </AlertDialogTitle>
          <AlertDialogDescription>
            <p className="mb-2">
              Line Item ID: <span className="font-mono">{lineItemId}</span>
            </p>
            <p className="text-xs text-gray-600 mb-3">
              Note: Only images up to 5 MB are accepted. Accepted images will be resized and center-cropped to 300x300 pixels and converted to JPG before upload.
            </p>
            {step === "choose" && (
              <div className="flex flex-col gap-4">
                <Button
                  className="bg-[#CE1616] hover:bg-transparent active:bg-[#E64040] text-white hover:text-black extra-bold"
                  onClick={handleChooseLocal}
                >
                  <h3>Select from Device</h3>
                </Button>
                <Button
                  className="bg-[#CE1616] hover:bg-transparent active:bg-[#E64040] text-white hover:text-black extra-bold"
                  onClick={handleChooseCamera}
                >
                  <h3>Open Camera</h3>
                </Button>
              </div>
            )}
            {step === "upload" && (
              <div className="flex flex-col gap-2">
                <input type="file" accept="image/*" onChange={handleFileChange} />
                {previewUrl && (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="mt-2 max-h-40 rounded w-auto max-w-full object-contain"
                  />
                )}
              </div>
            )}
            {step === "camera" && (
              <div className="flex flex-col items-center gap-2">
                {!cameraImg ? (
                  <>
                    <Webcam
                      audio={false}
                      ref={webcamRef}
                      screenshotFormat="image/jpeg"
                      screenshotQuality={0.7}
                      width={320}
                      height={240}
                      videoConstraints={{
                        facingMode: { ideal: "environment" },
                        width: { ideal: 1280, max: 1280 },
                        height: { ideal: 720, max: 720 },
                      }}
                    />
                    <Button
                      className="bg-blue-600 text-white py-2 rounded mt-2"
                      onClick={handleCapture}
                    >
                      <h3>Capture</h3>
                    </Button>
                  </>
                ) : (
                  <>
                    {previewUrl && (
                      <img src={previewUrl} alt="Preview" className="max-h-40 rounded w-auto max-w-full object-contain" />
                    )}
                    <Button
                      className="bg-gray-600 text-white py-2 rounded mt-2"
                      onClick={() => {
                        setCameraImg(null);
                        setSelectedFile(null);
                        if (previewUrl) URL.revokeObjectURL(previewUrl);
                        setPreviewUrl(null);
                      }}
                    >
                      <h3>Retake</h3>
                    </Button>
                  </>
                )}
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>
            <h5 className="extra-bold">Cancel</h5>
          </AlertDialogCancel>
          {(step === "upload" || (step === "camera" && cameraImg)) && (
            <AlertDialogAction
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleUpload}
              disabled={!selectedFile}
            >
              <h5 className="extra-bold">Upload</h5>
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}