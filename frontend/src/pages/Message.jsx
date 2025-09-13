// src/pages/Message.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  doc,
  getDoc,
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { ArrowLeft, Send } from 'lucide-react';

const Message = () => {
  const { id: recipientId } = useParams();
  const navigate = useNavigate();

  const [recipient, setRecipient] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef(null);
  const currentUser = auth.currentUser;

  /** Fetch recipient profile */
  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    const fetchRecipient = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, 'users', recipientId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setRecipient({ id: docSnap.id, ...docSnap.data() });
        } else {
          console.error('Recipient not found');
          navigate('/friend-suggestions');
        }
      } catch (error) {
        console.error('Error fetching recipient:', error);
        navigate('/friend-suggestions');
      } finally {
        setLoading(false);
      }
    };

    fetchRecipient();
  }, [recipientId, currentUser, navigate]);

  /** Listen for messages */
  useEffect(() => {
    if (!currentUser || !recipientId) return;

    const chatId = [currentUser.uid, recipientId].sort().join('_');
    const messagesRef = collection(db, 'messages', chatId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetched = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            // Handle Firestore timestamp conversion more safely
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
          };
        });
        setMessages(fetched);
      },
      (error) => {
        console.error('Error fetching messages:', error);
      }
    );

    return () => unsubscribe();
  }, [currentUser, recipientId]);

  /** Scroll to bottom on new messages */
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  /** Handle sending message */
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser || !recipientId || sending) return;

    const messageText = newMessage.trim();
    setNewMessage(''); // Clear input immediately for better UX
    setSending(true);

    const chatId = [currentUser.uid, recipientId].sort().join('_');
    const chatDocRef = doc(db, 'messages', chatId);

    try {
      // Ensure chat document exists first
      const chatSnap = await getDoc(chatDocRef);
      if (!chatSnap.exists()) {
        await setDoc(chatDocRef, {
          participants: [currentUser.uid, recipientId],
          createdAt: serverTimestamp(),
        });
      }

      // Add message to subcollection
      const messagesSubRef = collection(chatDocRef, 'messages');
      await addDoc(messagesSubRef, {
        from: currentUser.uid,
        senderName: currentUser.displayName || 'Anonymous',
        senderAvatar: currentUser.photoURL || '',
        recipientId,
        text: messageText,
        createdAt: serverTimestamp(),
      });

      console.log('Message sent successfully');

    } catch (error) {
      console.error('Error sending message:', error);
      // Restore message text if sending failed
      setNewMessage(messageText);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  // Handle keyboard shortcuts
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading chat...</p>
        </div>
      </div>
    );
  }

  if (!recipient) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Chat recipient not found.</p>
          <button
            onClick={() => navigate('/friend-suggestions')}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm p-4 flex items-center border-b border-gray-200 sticky top-0 z-10">
        <button
          onClick={() => navigate(-1)}
          className="mr-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <img
          src={
            recipient.avatar ||
            'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=50&h=50&fit=crop&crop=face'
          }
          alt={recipient.name}
          className="w-10 h-10 rounded-full object-cover mr-3"
          onError={(e) => {
            e.target.src = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=50&h=50&fit=crop&crop=face';
          }}
        />
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-gray-800">
            {recipient.name}
          </h2>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-100">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Send className="w-12 h-12 mb-4 text-gray-300" />
            <p className="text-lg">Say hello!</p>
            <p className="text-sm">
              Start a conversation with {recipient.name}.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isCurrentUser = msg.from === currentUser.uid;
            return (
              <div
                key={msg.id}
                className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`flex items-end max-w-[70%] ${
                    isCurrentUser
                      ? 'flex-row-reverse space-x-reverse space-x-2'
                      : 'space-x-2'
                  }`}
                >
                  {!isCurrentUser && (
                    <img
                      src={msg.senderAvatar || recipient.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=30&h=30&fit=crop&crop=face'}
                      alt={msg.senderName}
                      className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=30&h=30&fit=crop&crop=face';
                      }}
                    />
                  )}
                  <div
                    className={`px-4 py-2 rounded-lg shadow-sm break-words ${
                      isCurrentUser
                        ? 'bg-blue-500 text-white rounded-br-none'
                        : 'bg-white text-gray-800 rounded-bl-none'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    <span className={`text-xs mt-1 block ${isCurrentUser ? 'text-blue-100' : 'text-gray-500'}`}>
                      {msg.createdAt instanceof Date
                        ? msg.createdAt.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Sending...'
                      }
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white p-4 border-t border-gray-200">
        <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="flex-1 p-3 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-800"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className={`p-3 rounded-full transition-colors flex items-center justify-center shadow-lg ${
              !newMessage.trim() || sending
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            {sending ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Message;