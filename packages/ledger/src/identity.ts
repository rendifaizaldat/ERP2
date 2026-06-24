import nacl from "tweetnacl";
import { decodeBase64, encodeBase64, decodeUTF8 } from "tweetnacl-util";

export class IdentityManager {
  private keyPair: nacl.SignKeyPair | null = null;

  /**
   * Load keypair dari storage atau generate baru jika belum ada
   */
  async loadOrCreateIdentity(): Promise<string> {
    const storedSecret = localStorage.getItem("__asstro_identity_sk__");

    if (storedSecret) {
      const secretKey = decodeBase64(storedSecret);
      this.keyPair = nacl.sign.keyPair.fromSecretKey(secretKey);
    } else {
      this.keyPair = nacl.sign.keyPair();
      localStorage.setItem(
        "__asstro_identity_sk__",
        encodeBase64(this.keyPair.secretKey),
      );
    }

    return encodeBase64(this.keyPair.publicKey);
  }

  /**
   * Sign data menggunakan Private Key
   */
  sign(message: string): string {
    if (!this.keyPair) throw new Error("Identity not loaded");
    const signature = nacl.sign.detached(
      decodeUTF8(message),
      this.keyPair.secretKey,
    );
    return encodeBase64(signature);
  }

  getPublicKey(): string {
    if (!this.keyPair) throw new Error("Identity not loaded");
    return encodeBase64(this.keyPair.publicKey);
  }
}
