import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    image: {
      type: String,
    },
    // E2E Encryption fields
    isEncrypted: {
      type: Boolean,
      default: false,
    },
    encryptedKey: {
      type: String, // AES key encrypted with recipient's RSA public key
    },
    senderEncryptedKey: {
      type: String, // AES key encrypted with sender's RSA public key (for sender to read)
    },
    iv: {
      type: String, // Initialization vector for AES-GCM
    },
    // Digital Signature fields
    signature: {
      type: String, // RSA-PSS signature of message hash
    },
    senderPublicKey: {
      type: String, // Sender's public key at time of sending (for verification)
    },
  },
  { timestamps: true }
);

const Message = mongoose.model("Message", messageSchema);

export default Message;
