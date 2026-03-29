class SourceStream {
  private source: string;
  private cursor: number;
  private limit: number;
  private storage: string[];
  private totalLength: number;
  private currentCode: number;

  public constructor(source: string) {
    this.source = source;
    this.cursor = 0;
    this.limit = source.length;
    this.storage = [];
    this.totalLength = this.limit;
    this.currentCode = -1;
  }

  public next(): number {
    const code = this.peek();
    this.currentCode = code;
    this.cursor++;
    return code;
  }

  public advance() {
    this.cursor++;
  }

  public peek() {
    if (this.cursor >= this.limit) {
      const storage = this.storage;
      if (storage.length === 0)
        return -1;
      this.source = this.source + storage.shift()!;
      this.limit = this.source.length;
    }
    return this.source.charCodeAt(this.cursor);
  }

  public skip(byteCount: number = 1) {
    if (byteCount < 1 && this.cursor + byteCount >= this.totalLength)
      throw new Error("Invalid skipped byte count.");

    this.cursor += byteCount;
  }

  public current(): number {
    return this.currentCode;
  }

  public back(byteCount: number = 1): void {
    this.cursor -= byteCount;
  }

  public isEmpty() {
    return this.cursor >= this.limit;
  }

  public append(source: string) {
    this.storage.push(source);
    this.totalLength += source.length;
  }

  public getCursorPosition() {
    return this.cursor;
  }
}

class TextBuffer {
  private storage: number[];
  private index: number;
  private limit: number;

  public constructor() {
    this.storage = new Array(48);
    this.index = 0;  
    this.limit = 48;
  }

  public append(code: number) {
    if (this.index >= this.limit) {
      this.storage = [...this.storage, ...new Array(48)];
      this.limit += 48;
    }
    this.storage[this.index++] = code;
  }

  public join(textBuffer: TextBuffer) {
    let limit = textBuffer.index;
    let storage = textBuffer.storage;

    for (let cursor = 0; cursor < limit; cursor++)
      this.append(storage[cursor]);
  }

  public size() {
    return this.index;
  }

  public reset() {
    this.index = 0;
  }

  public toString(): string {
    return this.storage.slice(0, this.index).map(code => String.fromCharCode(code)).join("");
  }
}



function char(char: string) {
  return char.charCodeAt(0);
}

const code_a = char("a");
const code_z = char("z");

const code_A = char("A");
const code_Z = char("Z");

const code_0 = char("0");
const code_9 = char("9");

const code_minus = char("-");
const code_divide = char("/");
const code_lt = char("<");
const code_gt = char(">");
const code_not = char("!");

const code_colon = char(":");
const code_equal = char("=");
const code_space = char(" ");
const code_cr = char("\r");
const code_lf = char("\n");
const code_tab = char("\t");
const code_quote_single = char("'");
const code_quote_double = char('"');
const code_dollar = char("$");
const code_left_cbracket = char("{");
const code_right_cbracket = char("}");

const code_eos = -1;

function isAlpha(code: number) {
  return code >= code_a && code <= code_z || code >= code_A && code <= code_Z;
}

function isNumeric(code: number) {
  return code >= code_0 && code <= code_9;
}

function isAlphaNumeric(code: number) {
  return isAlpha(code) || isNumeric(code);
}

function isTagNameStart(code: number) {
  return isAlpha(code);
}

function isTagNamePart(code: number) {
  return isTagNameStart(code) || isNumeric(code) || code === code_minus;
}

function isAttributeNameStart(code: number) {
  return isAlpha(code) || code === code_colon;
}

function isAttributeNamePart(code: number) {
  return isAttributeNameStart(code) || isNumeric(code) || code === code_minus;
}

function isWhiteSpace(code: number) {
  return code === code_space || code === code_cr || code === code_lf || code === code_tab;
}

function isAttributeValueStart(code: number) {
  return code === code_quote_double || code === code_quote_single;
}

const Token = {
  TAG_START: 0,
  TAG_END: 1,
  TEXT: 2,
  COMMENT: 3,
  EOS: 4,
  INVALID: 5,
  TEXT_BINDING: 6
};

class AstNode {
  private children: Set<AstNode>;
  private parentNode: AstNode | null;
  private bindings: Map<string, Set<String>>;

  public constructor(parent: AstNode | null) {
    this.children = new Set();
    this.parentNode = parent;
    this.bindings = new Map();
  }

  public append(node: AstNode) {
    this.children.add(node);
  }

  public getChildren() {
    return this.children;
  }

  public getParentNode(): AstNode {
    return this.parentNode!;
  }

  public isTextNode() {
    return this instanceof AstTextNode;
  }

  public isElement() {
    return this instanceof AstElement;
  }

  public setBindings(bindings: Map<string, Set<string>>) {
    this.bindings = bindings;
  }

  public getBindings() {
    return this.bindings;
  }
}

class AstRoot extends AstNode {
  private constructor() {
    super(null);
  }

  static getInstance() {
    return new AstRoot();
  }
}

class AstElement extends AstNode {
  private tagName: string;
  private attributes: Map<string, string>;
  private selfClosing: boolean;

  public constructor(parentNode: AstNode | null, tagName: string) {
    super(parentNode);
    this.tagName = tagName;
    this.attributes = new Map();
    this.selfClosing = false;
  }

  public setAttributes(attributes: Map<string, string>) {
    this.attributes = attributes;
  }

  public setAsSelfClosing() {
    return this.selfClosing = true;
  }

  public isSelfClosing() {
    return this.selfClosing;
  }

  public getTagName() {
    return this.tagName.toLowerCase();
  }

  public setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
  }
}

class AstTextNode extends AstNode {
  private textContent: string;

  public constructor(parent: AstNode | null, textContent: string) {
    super(parent);
    this.textContent = textContent;
  }

  public setTextContent(textContent: string) {
    this.textContent = textContent;
  }

  public getTextContent() {
    return this.textContent;
  }
}

class AstComment extends AstNode {
  private commentText: string;

  public constructor(parent: AstNode | null, commentText: string) {
    super(parent);
    this.commentText = commentText;
  }

  public getCommentText() {
    return this.commentText;
  }
}

class AstBindingNode extends AstNode {
  private bindingExpression: string;

  public constructor(parent: AstNode | null, bindingExpression: string) {
    super(parent);
    this.bindingExpression = bindingExpression;
  }

  public getBindingExpression() {
    return this.bindingExpression;
  }
}

let rootNode: AstNode = AstRoot.getInstance();

class HTMLSourceScanner {
  private stream: SourceStream;
  private nameBuffer: TextBuffer;
  private tagName: string;
  private attributes: Map<string, string>;
  private selfClosing: boolean;
  private code: number;
  private attributeBindings: Map<string, Set<any>>;

  public constructor(stream: SourceStream) {
    this.stream = stream;  
    this.nameBuffer = new TextBuffer(); 
    this.tagName = "";
    this.attributes = new Map();
    this.selfClosing = false;
    this.attributeBindings = new Map();
    this.code = -1;
  }

  public nextToken(): number {
    this.resetValues();
    this.skipWhiteSpace();

    const code = this.peek();
    switch (code) {
      case code_lt: // ">"
        this.advance();
        if (this.peek() === code_divide) // "/"
          return this.scanTagEnd();
        if (this.next() === code_not) { // "!"
          if (this.next() === code_minus) { // "-"
            if (this.next() === code_minus) // "-"
              return this.scanComment();
            this.back();
          }
          this.back();
        }
        this.back();
        return this.scanTagStart();

      case code_dollar:
        this.advance();
        if (this.peek() === code_left_cbracket)
          return this.scanTextBinding(); 
        return this.scanText();

      case code_eos:
        return Token.EOS;

      default:
        return this.scanText();
    }
  }

  private scanTextBinding() {
    this.advance();
    
    let expCode;
    while ((expCode = this.peek()) !== code_eos && expCode !== code_right_cbracket) {
      // if an end tag is inserted into the binding expression
      if (this.peek() === code_lt) {
        this.advance(); // consume '<'
        if (isTagNameStart(this.peek()) || this.peek() === code_divide) {
          this.back(); // push back '<'
          // because '{' doesn't meet, it will fallback as a plain text node
          return Token.TEXT;
        }
      }

      // store the scanned token into buffer
      this.nameBuffer.append(this.peek());
      this.advance(); // consume each stored token
    }

    // if the '{' doesn't meet, it will be a simple text node instead of binding node
    if (expCode === code_eos)
      return Token.TEXT;

    this.advance(); // consume '}' and return as Text binding node
    return Token.TEXT_BINDING;
  }

  public isSelfClosing() {
    return this.selfClosing;
  }

  public getAttributes() {
    return this.attributes;
  }

  public resetAttributes() {
    this.attributes = new Map();
  }

  public getTagName() {
    return this.tagName;
  }

  public getTextContent() {
    return this.nameBuffer.toString();
  }

  public getBindingExpression() {
    return this.nameBuffer.toString();
  }

  public getAttributeBindings() {
    return this.attributeBindings;
  }

  private resetValues() {
    this.nameBuffer.reset();
    this.attributes = new Map();
    this.selfClosing = false;
    this.tagName = "";
    this.attributeBindings = new Map();
  }

  private peek() {
    return this.code = this.stream.peek();
  }

  private peekChar() {
    return String.fromCharCode(this.peek());
  }

  private advance() {
    return this.stream.advance();
  }

  private next() {
    return this.stream.next();
  }

  private back(byteCount: number = 1) {
    this.stream.back(byteCount);
  }

  private scanComment() {
    do {
      const code = this.next();
      if (code === code_minus) {
        if (this.next() === code_minus) {
          if (this.next() === code_gt)
            break;
          this.back();
        }
        this.back();
      }
      this.nameBuffer.append(code);
    } while (this.peek() !== code_eos);
    return Token.COMMENT;
  }

  private scanText() {
    do {
      if (this.peek() === code_lt) {
        this.advance(); // consume <

        // check if the next token is a valid start of a tag name or a slash '/'
        if (isTagNameStart(this.peek()) || this.peek() === code_divide) {
          this.back();
          return Token.TEXT;
        }
        this.nameBuffer.append(code_lt);
      }

      if (this.peek() === code_dollar) {
        this.advance();
        if (this.peek() === code_left_cbracket) {
          this.back();
          return Token.TEXT;
        }
      }

      this.nameBuffer.append(this.peek());
      this.advance();
    } while (this.peek() !== code_eos);

    console.log("scanText", this.nameBuffer.toString());
    return Token.TEXT;
  }

  private scanTagStart() {
    if (!isTagNameStart(this.peek()))
      throw new Error("Invalid token");

    this.tagName = this.scanTagName();

    this.skipWhiteSpace();
    if (this.peek() === code_gt) {
      this.advance();
      return Token.TAG_START;
    }
    
    this.scanAttributes();

    let code = this.peek();

    if (code === code_divide) {
      this.selfClosing = true;
      this.advance(); // consume /
    }

    
    if (this.peek() !== code_gt)
      throw new Error("Invalid end of start tag.");

    this.advance(); // consume >

    return Token.TAG_START;
  }

  private scanTagEnd() {
    this.advance();
    const endTagName = this.scanTagName();
    this.tagName = endTagName;

    if (this.peek() !== code_gt)
      throw new Error("Invalid end of end tag.");

    this.advance();
    return Token.TAG_END;
  }

  private scanTagName() {
    this.nameBuffer.reset();

    let code: number;
    while ((code = this.peek()) !== -1 && isTagNamePart(code)) {
      this.nameBuffer.append(code);
      this.advance();
    }
    return this.nameBuffer.toString();
  }

  private scanAttributes() {
    do {
      const name = this.scanAttributeName();
      this.skipWhiteSpace();
      
      let code = this.peek();
      if (code !== code_equal && code !== code_gt && code !== code_divide && !isAttributeNameStart(code))
        throw new Error("Next token must be either '>', '=' or an attribute name.");
      
      let value = "";
      if (code === code_equal) {
        this.next();
        this.skipWhiteSpace();
        value = this.scanAttributeValue(name);
      }
      
      
      this.attributes.set(name, value);
      
      this.skipWhiteSpace();
    } while (this.peek() !== code_gt && this.peek() !== code_divide);
  }

  private scanAttributeName() {
    if (!isAttributeNameStart(this.peek()))
      throw new Error(`Invalid start of an attribute name '${this.peekChar()}'.`);

    this.nameBuffer.reset();

    let code: number;
    while ((code = this.peek()) && isAttributeNamePart(code)) {
      this.advance();
      this.nameBuffer.append(code);
    }

    return this.nameBuffer.toString();
  }

  private scanAttributeValue(name: string) {
    if (!isAttributeValueStart(stream.peek()))
      throw new Error("Invalid start of attribute value.");

    this.nameBuffer.reset();
    
    const quote = this.next(); // quote used to start the attribute value 
    let code: number;

    while ((code = this.peek()) !== code_eos && code !== quote) { // this loop will only stop if we meet the "end of source" or the quote (' or ") used to start the attribute value
      // if we meet the token '${' scan the expression

      if (code === code_dollar) {
        this.advance(); // consume '$'
        if (this.peek() === code_left_cbracket) {
          this.advance(); // consume '{'
          this.scanBindingInsideAttributeValue(name, quote);
          continue;
        } 

        this.back();
        code = code_dollar;
      }
      
      this.nameBuffer.append(code);
      this.advance();
    }

    if (code !== quote)
      throw new Error("Invalid end of attribute value.");

    this.advance();
    
    return this.nameBuffer.toString();
  }

  private scanBindingInsideAttributeValue(attributeName: string, quote: number) {
    let expCode;
    let expBuffer = new TextBuffer();

    while ((expCode = this.peek()) !== code_eos && expCode !== quote && expCode !== code_right_cbracket) {
      expBuffer.append(this.peek());
      this.advance();
    }

    if (expCode === code_eos)
      throw new Error("Unexpected end of an attribute value.");

    if (expCode === quote) {
      this.nameBuffer.join(expBuffer);
      this.back();
      return;
    }

    this.advance(); // consume '}'
    let attributeBinding = this.attributeBindings.get(attributeName);
    if (!attributeBinding) {
      attributeBinding = new Set();
      this.attributeBindings.set(attributeName, attributeBinding);
    }
    attributeBinding.add(expBuffer.toString());
  }

  public skipWhiteSpace() {
    let code: number;
    while ((code = this.peek()) !== -1 && isWhiteSpace(code)) {
      this.advance();
    }
  }
}

class HTMLSourceParser {
  private scanner: HTMLSourceScanner;
  private currentNode: AstNode;
  private rootNode: AstNode;

  public constructor(stream: SourceStream) {
    this.scanner = new HTMLSourceScanner(stream);
    this.rootNode = AstRoot.getInstance();
    this.currentNode = this.rootNode;
  }

  public parse() {
    let token: number;
    while ((token = this.scanner.nextToken()) !== Token.EOS) {
      if (token === Token.TAG_START) {
        let node = new AstElement(this.currentNode, this.scanner.getTagName());
        node.setAttributes(this.scanner.getAttributes());
        this.currentNode.append(node);
        this.currentNode = node;
        node.setBindings(this.scanner.getAttributeBindings());
      } else if (token === Token.TAG_END) {
        const tagName = this.scanner.getTagName();
        const currentTagName = (this.currentNode as AstElement).getTagName();
        if (currentTagName !== tagName)
          throw new Error(`End tag must be '${currentTagName}', instead '${tagName}' was found.`);
        this.currentNode = this.currentNode.getParentNode();

      } else if (token === Token.TEXT) {
        const textNode = new AstTextNode(this.currentNode, this.scanner.getTextContent());
        this.currentNode.append(textNode);

      } else if (token === Token.COMMENT) {
        this.currentNode.append(new AstComment(this.currentNode, this.scanner.getTextContent()));

      } else if (token === Token.TEXT_BINDING) {
        const bindingNode = new AstBindingNode(this.currentNode, this.scanner.getBindingExpression());
        this.currentNode.append(bindingNode);

      } else {
        if (token === Token.INVALID)
          throw new Error("Invalid token.");
      }
    }
  }

  public getRootNode() {
    return this.rootNode;
  }
}

class HTMLBuilder {
  private rootNode: AstNode;

  public constructor(rootNode: AstRoot) {
    this.rootNode = rootNode;
  }

  public build() {
    
  }
}

let htmlCode = `<!-- hello --><div class="container \${showContainerClass}" click="\${handleClick}" id="container">Hello \${name}!<h1 data-content="world!">Hello \${name</h1><script>alert('Hello World!');</script></div>`;
const stream = new SourceStream(htmlCode);

let parser = new HTMLSourceParser(stream);
parser.parse();
const root = parser.getRootNode();
console.log([...root.getChildren()][1]);