import mongoose from "mongoose";

const groupMessageSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: function () {
        return this.type === "message";
      },
    },
    text: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    image: {
      type: String,
    },
    // Message type: 'message' for regular messages, 'system' for notifications
    type: {
      type: String,
      enum: ["message", "system"],
      default: "message",
    },
    // For system messages, store the action type
    systemAction: {
      type: String,
      enum: ["member_added", "member_removed", "member_left", "member_promoted", "member_demoted", null],
      default: null,
    },
    // E2E Encryption fields
    isEncrypted: {
      type: Boolean,
      default: false,
    },
    // Array of encrypted keys - one for each group member
    encryptedKeys: [{
      recipientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      encryptedKey: String, // AES key encrypted with recipient's RSA public key
    }],
    iv: {
      type: String, // Initialization vector for AES-GCM
    },
    // Digital Signature
    signature: {
      type: String,
    },
    senderPublicKey: {
      type: String,
    },
  },
  { timestamps: true }
);

// Index for faster message retrieval by group
groupMessageSchema.index({ groupId: 1, createdAt: 1 });

const GroupMessage = mongoose.model("GroupMessage", groupMessageSchema);

export default GroupMessage;
