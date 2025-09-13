import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';

const ChatWindow = ({ chat }) => {
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const bottomRef = useRef();

  useEffect(() => {
    const q = query(
      collection(db, 'messages', chat.id, 'messages'),
      orderBy('timestamp')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    });

    return () => unsubscribe();
  }, [chat.id]);

  const handleSend = async () => {
    if (!newMsg.trim()) return;
    await addDoc(collection(db, 'messages', chat.id, 'messages'), {
      text: newMsg,
      from: auth.currentUser.uid,
      timestamp: serverTimestamp(),
    });
    setNewMsg('');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`p-2 rounded ${msg.from === auth.currentUser.uid ? 'bg-blue-200 self-end' : 'bg-gray-200 self-start'}`}
          >
            {msg.text}
          </div>
        ))}
        <div ref={bottomRef}></div>
      </div>

      <div className="p-4 border-t flex">
        <input
          type="text"
          className="flex-1 p-2 border rounded mr-2"
          value={newMsg}
          onChange={(e) => setNewMsg(e.target.value)}
          placeholder="Type a message..."
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <button onClick={handleSend} className="bg-blue-500 text-white px-4 rounded">Send</button>
      </div>
    </div>
  );
};

export default ChatWindow;
