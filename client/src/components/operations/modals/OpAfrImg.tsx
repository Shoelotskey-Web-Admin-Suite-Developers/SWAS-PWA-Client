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
  const webcamRef = useRef<Webcam>(null);

  const handleChooseLocal = () => setStep("upload");
  const handleChooseCamera = () => setStep("camera");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleCapture = () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setCameraImg(imageSrc);
      fetch(imageSrc)
        .then((res) => res.blob())
        .then((blob) => {
          const file = new File([blob], "camera.jpg", { type: "image/jpeg" });
          setSelectedFile(file);
        });
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !lineItemId) return;
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
                {selectedFile && (
                  <img
                    src={URL.createObjectURL(selectedFile)}
                    alt="Preview"
                    className="mt-2 max-h-40 rounded"
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
                      width={320}
                      height={240}
                      videoConstraints={{ facingMode: "environment" }}
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
                    <img src={cameraImg} alt="Captured" className="max-h-40 rounded" />
                    <Button
                      className="bg-gray-600 text-white py-2 rounded mt-2"
                      onClick={() => {
                        setCameraImg(null);
                        setSelectedFile(null);
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