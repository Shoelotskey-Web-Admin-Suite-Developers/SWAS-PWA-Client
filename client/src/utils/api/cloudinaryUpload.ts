export async function uploadToCloudinary(file: File): Promise<string | null> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "shoe-image"); // <-- Replace with your preset

  const cloudName = "dscz4immd"; // <-- Replace with your cloud name
  const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

  try {
    const res = await fetch(url, {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    return data.secure_url || null;
  } catch (err) {
    console.error("Cloudinary upload error:", err);
    return null;
  }
}