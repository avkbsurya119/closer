// E2E Encryption and Digital Signature utilities using Web Crypto API

const STORAGE_KEY = "closer_private_key";

// ==================== KEY GENERATION ====================

// Generate RSA key pair for encryption and signing
export const generateKeyPair = async () => {
  try {
    // Generate RSA-OAEP key pair for encryption
    const encryptionKeyPair = await window.crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true, // extractable
      ["encrypt", "decrypt"]
    );

    // Export keys
    const publicKeyJwk = await window.crypto.subtle.exportKey(
      "jwk",
      encryptionKeyPair.publicKey
    );
    const privateKeyJwk = await window.crypto.subtle.exportKey(
      "jwk",
      encryptionKeyPair.privateKey
    );

    return {
      publicKey: JSON.stringify(publicKeyJwk),
      privateKey: JSON.stringify(privateKeyJwk),
    };
  } catch (error) {
    console.error("Error generating key pair:", error);
    throw error;
  }
};

// ==================== KEY STORAGE ====================

// Store private key in localStorage
export const storePrivateKey = (privateKey) => {
  localStorage.setItem(STORAGE_KEY, privateKey);
};

// Get private key from localStorage
export const getStoredPrivateKey = () => {
  return localStorage.getItem(STORAGE_KEY);
};

// Remove private key from localStorage
export const removePrivateKey = () => {
  localStorage.removeItem(STORAGE_KEY);
};

// Check if user has encryption keys
export const hasEncryptionKeys = () => {
  return !!getStoredPrivateKey();
};

// ==================== KEY IMPORT ====================

// Import public key for encryption
const importPublicKey = async (publicKeyJson) => {
  const jwk = JSON.parse(publicKeyJson);
  return await window.crypto.subtle.importKey(
    "jwk",
    jwk,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["encrypt"]
  );
};

// Import private key for decryption
const importPrivateKey = async (privateKeyJson) => {
  const jwk = JSON.parse(privateKeyJson);
  return await window.crypto.subtle.importKey(
    "jwk",
    jwk,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["decrypt"]
  );
};

// Import private key for signing (need to convert to RSASSA-PKCS1-v1_5)
const importPrivateKeyForSigning = async (privateKeyJson) => {
  const jwk = JSON.parse(privateKeyJson);
  // Modify the key for signing operations
  const signingJwk = { ...jwk, key_ops: ["sign"] };
  return await window.crypto.subtle.importKey(
    "jwk",
    signingJwk,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    true,
    ["sign"]
  );
};

// Import public key for verification
const importPublicKeyForVerification = async (publicKeyJson) => {
  const jwk = JSON.parse(publicKeyJson);
  const verifyJwk = { ...jwk, key_ops: ["verify"] };
  return await window.crypto.subtle.importKey(
    "jwk",
    verifyJwk,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    true,
    ["verify"]
  );
};

// ==================== AES ENCRYPTION ====================

// Generate random AES key
const generateAESKey = async () => {
  return await window.crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );
};

// Generate random IV
const generateIV = () => {
  return window.crypto.getRandomValues(new Uint8Array(12));
};

// ==================== ENCRYPTION ====================

// Encrypt message with hybrid encryption (AES + RSA)
// Encrypts for both recipient (to read) and sender (to read own messages)
export const encryptMessage = async (message, recipientPublicKey, senderPrivateKey, senderPublicKey) => {
  try {
    // 1. Generate random AES key
    const aesKey = await generateAESKey();

    // 2. Generate IV
    const iv = generateIV();

    // 3. Encrypt message with AES-GCM
    const encoder = new TextEncoder();
    const messageBuffer = encoder.encode(message);

    const encryptedContent = await window.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      aesKey,
      messageBuffer
    );

    // 4. Export AES key
    const aesKeyBuffer = await window.crypto.subtle.exportKey("raw", aesKey);

    // 5. Encrypt AES key with recipient's RSA public key
    const recipientKey = await importPublicKey(recipientPublicKey);
    const encryptedAESKey = await window.crypto.subtle.encrypt(
      {
        name: "RSA-OAEP",
      },
      recipientKey,
      aesKeyBuffer
    );

    // 6. Also encrypt AES key with sender's RSA public key (so sender can read own messages)
    let senderEncryptedAESKey = null;
    if (senderPublicKey) {
      const senderKey = await importPublicKey(senderPublicKey);
      senderEncryptedAESKey = await window.crypto.subtle.encrypt(
        {
          name: "RSA-OAEP",
        },
        senderKey,
        aesKeyBuffer
      );
    }

    // 7. Create hash-based signature (HMAC-like using SHA-256)
    const signature = await hashMessage(message);

    // 8. Convert to base64 for storage
    return {
      encryptedContent: arrayBufferToBase64(encryptedContent),
      encryptedKey: arrayBufferToBase64(encryptedAESKey),
      senderEncryptedKey: senderEncryptedAESKey ? arrayBufferToBase64(senderEncryptedAESKey) : null,
      iv: arrayBufferToBase64(iv),
      signature: signature,
      isEncrypted: true,
    };
  } catch (error) {
    console.error("Error encrypting message:", error);
    throw error;
  }
};

// ==================== DECRYPTION ====================

// Decrypt message
export const decryptMessage = async (encryptedData, privateKey) => {
  try {
    const { encryptedContent, encryptedKey, iv } = encryptedData;

    // 1. Import private key
    const rsaPrivateKey = await importPrivateKey(privateKey);

    // 2. Decrypt AES key with RSA
    const encryptedAESKeyBuffer = base64ToArrayBuffer(encryptedKey);
    const aesKeyBuffer = await window.crypto.subtle.decrypt(
      {
        name: "RSA-OAEP",
      },
      rsaPrivateKey,
      encryptedAESKeyBuffer
    );

    // 3. Import AES key
    const aesKey = await window.crypto.subtle.importKey(
      "raw",
      aesKeyBuffer,
      {
        name: "AES-GCM",
        length: 256,
      },
      true,
      ["decrypt"]
    );

    // 4. Decrypt message with AES
    const ivBuffer = base64ToArrayBuffer(iv);
    const encryptedContentBuffer = base64ToArrayBuffer(encryptedContent);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: ivBuffer,
      },
      aesKey,
      encryptedContentBuffer
    );

    // 5. Decode message
    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (error) {
    console.error("Error decrypting message:", error);
    throw error;
  }
};

// ==================== DIGITAL SIGNATURE (Hash-based) ====================

// Sign message by creating a hash (demonstrates integrity)
export const signMessage = async (message) => {
  try {
    return await hashMessage(message);
  } catch (error) {
    console.error("Error signing message:", error);
    throw error;
  }
};

// Verify signature by comparing hashes (demonstrates integrity verification)
export const verifySignature = async (message, signature, publicKey) => {
  try {
    // Hash the decrypted message
    const currentHash = await hashMessage(message);
    // Compare with stored signature (hash)
    return currentHash === signature;
  } catch (error) {
    console.error("Error verifying signature:", error);
    return false;
  }
};

// ==================== UTILITY FUNCTIONS ====================

// Convert ArrayBuffer to Base64
const arrayBufferToBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

// Convert Base64 to ArrayBuffer
const base64ToArrayBuffer = (base64) => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

// Hash a message using SHA-256 (for display purposes)
export const hashMessage = async (message) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
};
