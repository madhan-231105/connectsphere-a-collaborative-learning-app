import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload } from "lucide-react";
import { auth, db, storage } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const AddPost = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setPhoto(file);
    if (file) setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;

    if (!user) {
      alert("You must be logged in");
      return;
    }
    if (!title.trim() || !content.trim()) {
      alert("Title and content required");
      return;
    }

    setLoading(true);
    try {
      // Upload image if present
      let photoURL = "";
      if (photo) {
        const storageRef = ref(
          storage,
          `posts/${user.uid}/${Date.now()}-${photo.name}`
        );
        await uploadBytes(storageRef, photo);
        photoURL = await getDownloadURL(storageRef);
      }

      // Save post in Firestore under the user’s posts subcollection
      const postsRef = collection(db, "users", user.uid, "posts");
      await addDoc(postsRef, {
        title: title.trim(),
        content: content.trim(),
        photoURL,
        createdAt: serverTimestamp(),
      });

      // ✅ success: redirect
      navigate("/profile", { replace: true });
    } catch (error) {
      console.error(error);
      alert("Error publishing post: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center">
      {/* Header with back button */}
      <div className="w-full bg-white shadow p-4 flex items-center">
        <button
          onClick={() => navigate("/profile")}
          className="flex items-center text-blue-500 hover:text-blue-600"
        >
          <ArrowLeft className="w-5 h-5 mr-1" />
          Back
        </button>
        <h1 className="text-xl font-semibold flex-1 text-center">Create Post</h1>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full mt-6">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Post title"
            className="w-full border rounded p-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            placeholder="Write your content..."
            className="w-full border rounded p-2 h-32"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />

          {/* Photo upload */}
          <label className="block">
            <span className="text-gray-700 font-medium">Attach a photo</span>
            <div className="flex items-center mt-2">
              <label className="flex items-center cursor-pointer bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded">
                <Upload className="w-4 h-4 mr-2" />
                Choose File
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            </div>
          </label>

          {/* Preview image */}
          {preview && (
            <img
              src={preview}
              alt="preview"
              className="mt-2 w-full rounded-lg object-cover"
            />
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded disabled:opacity-50"
          >
            {loading ? "Publishing..." : "Publish"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddPost;
