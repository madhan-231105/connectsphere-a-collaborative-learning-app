// src/pages/Groups.jsx
import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

const Groups = () => {
  const [groups, setGroups] = useState([]);
  const [newGroupName, setNewGroupName] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "groups"), (snapshot) => {
      setGroups(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubscribe();
  }, []);

  const handleAddGroup = async () => {
    if (!newGroupName.trim()) return;
    const docRef = await addDoc(collection(db, "groups"), {
      name: newGroupName,
      createdAt: serverTimestamp(),
    });
    setNewGroupName("");
    navigate(`/group-chat/${docRef.id}`);
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold mb-4">Groups</h1>
      <ul className="space-y-2">
        {groups.map((group) => (
          <li
            key={group.id}
            className="p-2 border rounded-md cursor-pointer hover:bg-gray-100"
            onClick={() => navigate(`/group-chat/${group.id}`)}
          >
            {group.name}
          </li>
        ))}
      </ul>

      {/* Floating Add Group Button */}
      <div className="fixed bottom-6 right-6 flex flex-col items-end space-y-2">
        <input
          type="text"
          placeholder="New group name..."
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          className="border rounded-md p-2 mb-2"
        />
        <button
          onClick={handleAddGroup}
          className="bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-blue-700"
        >
          Add Group
        </button>
      </div>
    </div>
  );
};

export default Groups;
