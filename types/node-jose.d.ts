export namespace JWA {
  function decrypt(alg: any, key: any, cdata: any, props: any): any;
  function derive(alg: any, key: any, props: any): any;
  function digest(alg: any, data: any, props: any): any;
  function encrypt(alg: any, key: any, pdata: any, props: any): any;
  function sign(alg: any, key: any, pdata: any, props: any): any;
  function verify(alg: any, key: any, pdata: any, mac: any, props: any): any;
}
export namespace JWE {
  function createDecrypt(ks: any, opts: any): any;
  function createEncrypt(opts: any, rcpts: any, ...args: any[]): any;
}
export namespace JWK {
  const MODE_DECRYPT: string;
  const MODE_ENCRYPT: string;
  const MODE_SIGN: string;
  const MODE_UNWRAP: string;
  const MODE_VERIFY: string;
  const MODE_WRAP: string;
  function asKey(key: any, form: any, extras: any): any;
  function asKeyStore(ks: any): any;
  function createKey(kty: any, size: any, props: any): any;
  function createKeyStore(): any;
  function isKey(obj: any): any;
  function isKeyStore(obj: any): any;
}
export namespace JWS {
  function createSign(opts: any, signs: any, ...args: any[]): any;
  function createVerify(ks: any, opts: any): any;
}
export function canYouSee(ks: any, opts: any): any;
export function parse(input: any): any;
export namespace parse {
  function compact(input: any): any;
  function json(input: any): any;
}
export namespace util {
  function asBuffer(input: any, encoding: any): any;
  namespace base64url {
    function decode(base64url: any): any;
    function encode(buffer: any, encoding: any): any;
  }
  function randomBytes(len: any): any;
  namespace utf8 {
    function decode(input: any): any;
    function encode(input: any): any;
  }
}
