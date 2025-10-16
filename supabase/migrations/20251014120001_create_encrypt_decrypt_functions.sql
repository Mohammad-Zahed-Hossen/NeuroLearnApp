-- Migration: Create encrypt_token and decrypt_token RPC functions
-- Created: 2025-10-14
-- Description: Adds PostgreSQL functions for encrypting and decrypting Notion tokens using pgp_sym_encrypt/decrypt

-- Function to encrypt a token
CREATE OR REPLACE FUNCTION public.encrypt_token(plain_token TEXT, encryption_key TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN encode(pgp_sym_encrypt(plain_token, encryption_key), 'base64');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrypt a token
CREATE OR REPLACE FUNCTION public.decrypt_token(encrypted_token TEXT, encryption_key TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN pgp_sym_decrypt(decode(encrypted_token, 'base64'), encryption_key);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.encrypt_token(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrypt_token(TEXT, TEXT) TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION public.encrypt_token(TEXT, TEXT) IS 'Encrypts a plain text token using AES-256 encryption and returns base64 encoded result';
COMMENT ON FUNCTION public.decrypt_token(TEXT, TEXT) IS 'Decrypts a base64 encoded encrypted token using AES-256 decryption';
