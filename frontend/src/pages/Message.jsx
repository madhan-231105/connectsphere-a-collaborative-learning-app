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

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser || !recipientId || sending) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setSending(true);

    const chatId = [currentUser.uid, recipientId].sort().join('_');
    const chatDocRef = doc(db, 'messages', chatId);

    try {
      const chatSnap = await getDoc(chatDocRef);
      if (!chatSnap.exists()) {
        await setDoc(chatDocRef, {
          participants: [currentUser.uid, recipientId],
          createdAt: serverTimestamp(),
        });
      }

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
      setNewMessage(messageText);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading chat...</p>
        </div>
      </div>
    );
  }

  if (!recipient) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Chat recipient not found.</p>
          <button
            onClick={() => navigate('/friend-suggestions')}
            className="px-6 py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <img
            src={
              recipient.avatar ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(recipient.name || recipient.email)}&background=212529&color=fff&size=40`
            }
            alt={recipient.name}
            className="w-10 h-10 rounded-full object-cover border-2 border-gray-100"
          />
          <div className="flex-1">
            <h2 className="font-semibold text-gray-900">
              {recipient.name || 'Anonymous'}
            </h2>
            <p className="text-sm text-gray-500">{recipient.email}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 py-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                <Send className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-lg font-medium text-gray-900 mb-2">No messages yet</p>
              <p className="text-sm text-gray-500">
                Start a conversation with {recipient.name || 'this user'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => {
                const isCurrentUser = msg.from === currentUser.uid;
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`flex items-end gap-2 max-w-[70%] ${
                        isCurrentUser ? 'flex-row-reverse' : 'flex-row'
                      }`}
                    >
                      {!isCurrentUser && (
                        <img
                          src={
                            msg.senderAvatar ||
                            recipient.avatar ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.senderName)}&background=212529&color=fff&size=32`
                          }
                          alt={msg.senderName}
                          className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                        />
                      )}
                      <div
                        className={`px-4 py-3 rounded-2xl shadow-sm ${
                          isCurrentUser
                            ? 'bg-gray-900 text-white rounded-br-none'
                            : 'bg-white text-gray-900 border border-gray-200 rounded-bl-none'
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                        <span
                          className={`text-xs mt-1 block ${
                            isCurrentUser ? 'text-gray-300' : 'text-gray-500'
                          }`}
                        >
                          {msg.createdAt instanceof Date
                            ? formatTime(msg.createdAt)
                            : 'Sending...'
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 px-4 py-4">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSendMessage} className="flex items-end gap-3">
            <div className="flex-1">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all resize-none"
                rows="1"
                disabled={sending}
                style={{ minHeight: '48px', maxHeight: '120px' }}
                onInput={(e) => {
                  e.target.style.height = 'auto';
                  e.target.style.height = e.target.scrollHeight + 'px';
                }}
              />
            </div>
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className={`p-3 rounded-xl transition-all flex items-center justify-center shadow-sm ${
                !newMessage.trim() || sending
                  ? 'bg-gray-200 cursor-not-allowed'
                  : 'bg-gray-900 hover:bg-gray-800 text-white'
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
    </div>
  );
};

export default Message;