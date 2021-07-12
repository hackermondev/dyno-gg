{
	function filledArray(count, value) {
    return Array.apply(null, new Array(count))
      .map(function() { return value; });
  }
  function extractList(list, index) {
    return list.map(function(element) { return element[index]; });
  }
  function buildList(head, tail, index) {
    return [head].concat(extractList(tail, index));
  }
  function optionalList(value) {
    return value !== null ? value : [];
  }
  function buildBinaryExpression(head, tail) {
    return tail.reduce(function(result, element) {
      return {
        type: "BinaryExpression",
        operator: element[1],
        left: result,
        right: element[3]
      };
    }, head);
  }

  function buildLogicalExpression(head, tail) {
    return tail.reduce(function(result, element) {
      return {
        type: "LogicalExpression",
        operator: element[1],
        left: result,
        right: element[3]
      };
    }, head);
  }

  function flatten(list) {
     list = list.reduce((a, b) => a.concat(Array.isArray(b) ? flatten(b) : b), []);
     return list;
  }
}

Start
  = __ program:Program __ { return program }

Program
  = body:SourceElements? {
      return {
        type: "Program",
        body: optionalList(body)
      };
    }

SourceElements
  = head:SourceElement tail:(__ SourceElement)* {
      return buildList(head, tail, 1);
    }

SourceElement
  = AssignmentExpression
  / IfStatement
  / CloseStatement
  / BreakStatement
  / ReturnStatement
  / EnclosedMethod

__
  = (WhiteSpace / LineTerminatorSequence / Comment)*

_
  = (WhiteSpace / MultiLineCommentNoLineTerminator)*

EOS
  = __ ";"
  / _ SingleLineComment? LineTerminatorSequence
  / _ &"}"
  / __ EOF

EOF
  = !.

OpenOrComment
	= MethodOpen
	/ Comment

LineTerminator
  = [\n\r\u2028\u2029]

LineTerminatorSequence "end of line"
  = "\n"
  / "\r\n"
  / "\r"
  / "\u2028"
  / "\u2029"

Comment "comment"
  = MultiLineComment
  / SingleLineComment

MultiLineComment
  = "/*" (!"*/" SourceCharacter)* "*/"

MultiLineCommentNoLineTerminator
  = "/*" (!("*/" / LineTerminator) SourceCharacter)* "*/"

SingleLineComment
  = "//" (!LineTerminator SourceCharacter)*

// Number, Letter
Nl = [\u16EE-\u16F0\u2160-\u2182\u2185-\u2188\u3007\u3021-\u3029\u3038-\u303A\uA6E6-\uA6EF]

// Punctuation, Connector
Pc = [\u005F\u203F-\u2040\u2054\uFE33-\uFE34\uFE4D-\uFE4F\uFF3F]

// Separator, Space
Zs = [\u0020\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]

Text =
  characters:$((!OpenOrComment) c:Any)+ {
    return {
        type: 'Text',
        value: characters
    }
  }

EnclosedMethod =
  MethodOpen __ e:Method __ MethodClose { return e; }

Method =
  main:ArgumentKey args:Parameter* {
    var result = {
      type: 'Method',
      name: main,
    };

    if (main.includes('.')) {
      let parts = main.split('.');
      result.class = parts[0];
      result.name = parts[1];
    }

    if (args && args.length) {
    	result.args = args;
    }

    return result;
  }

Expression =
  first:ArgumentKey rest:("." s:ArgumentValue { return s; })* {
    return {
      type: 'Expression',
      value: [first].concat(rest)
    };
  }

Parameter = __ a:Argument { return a; }
ArgumentKey = $([0-9a-zA-Z_\-\.]+)

Value
	= Boolean
  / String
  / Float
	/ Number
	/ Array
	/ Tuple
	/ Object
	/ Variable

ArgumentValue
  = AdditiveExpression
	/ Value
  / EnclosedMethod
	/ Method

Argument
  = key:ArgumentKey __ ":" __ value:Parameter {
      return { type: "Argument", key: key, value: value };
    }
    / ArgumentValue

// Variable =
// 	first:'$' rest:$([0-9a-zA-Z_\-\.\$]+)* {
//     	return {
//         	type: 'Variable',
//           value: rest
//         };
//     }
Variable =
  first:'$' rest:([0-9a-zA-Z_\-\.\$]+ (('(' [0-9a-zA-Z_\-\.\$]+ ')')+)?)* {
      // console.log(flatten(rest).join(''));
    	return {
        	type: 'Variable',
          value: flatten(rest).join('')
        };
    }

String "String" =
  DoubleQuote text:(DoubleQuoteCharacter*) DoubleQuote {
    return { type: 'String', value: text.join('') };
  }
  / SingleQuote text:(SingleQuoteCharacter*) SingleQuote {
    return { type: 'String', value: text.join('') };
  }

StringLiteral
  = DoubleQuote text:(DoubleQuoteCharacter*) DoubleQuote {
    return text.join('');
  }
  / SingleQuote text:(SingleQuoteCharacter*) SingleQuote {
    return text.join('');
  }

Boolean "Boolean"
  = val:'true' {
    return { type: 'Boolean', value: val };
  }
  / val:'false' {
    return { type: 'Boolean', value: val };
  }

Number "Number"
	= num:([0-9\-]+) {
		return { type: 'Number', value: parseInt(num.join('')) };
	}

Float "Float"
  = num:(('+' / '-')? [0-9]+ (('.' [0-9]+) / ('e' [0-9]+))) {
    let val = flatten(num.filter(v => v !== null));
    return { type: 'Float', value: parseFloat(val.join('')) };
  }

// Float "Float"
//   = num:([0-9\.\-]+) {
//     return { type: 'Float', value: parseFloat(num.join('')) };
//   }

Elision
  = "," commas:(__ ",")* { return filledArray(commas.length + 1, null); }

Object
  = ObjectOpen
    members:(
      head:ObjectMember
      tail:(ValueSeprator m:ObjectMember { return m; })* {
        var result = {};

        [head].concat(tail).forEach(function(element) {
          result[element.name] = element.value;
        });

        return { type: 'Object', value: result };
      }
    )?
    ObjectClose
    { return members !== null ? members: {}; }

ObjectMember
  = name:(ArgumentKey / StringLiteral) __ KeyValueSeparator __ value:ArgumentValue {
      return { name: name, value: value };
    }

Array
  = ArrayOpen
    values:(
      head:ArgumentValue
      tail:(ValueSeprator v:ArgumentValue { return v; })* {
      	return { type: 'Array', value: [head].concat(tail) };
      }
    )?
    ArrayClose
    { return values !== null ? values : []; }

// ObjectValue
//   = AdditiveExpression
//   / EnclosedMethod
//   / Value

Tuple
  = TupleOpen
    values:(
      head:Value
      tail:(ValueSeprator v:Value { return v; })* {
      	return { type: 'Tuple', value: [head].concat(tail) };
      }
    )?
    TupleClose
    { return values !== null ? values : []; }

Initialiser
  = "=" !"=" __ expression:AssignmentExpression { return expression; }

AssignmentExpression
  = left:'$' id:$([0-9a-zA-Z_\-\.]+)* __
  	"=" !"=" __
  	value:(AdditiveExpression / ArgumentValue / EnclosedMethod) {
      return {
        type: "AssignmentExpression",
        id: id,
        value: value
      };
    }

BlockBody "Block Body"
  = c:(BlockElement / SourceElement)+ { return c; }

BlockElements
  = head:BlockElement tail:(__ BlockElement)* {
      return buildList(head, tail, 1);
    }
    / __

BlockElement
  = AssignmentExpression
  / IfStatement
  / BreakStatement
  / ReturnStatement
  / !CloseIdentifier e:EnclosedMethod { return e; }

ConditionalExpression
	= left:Value __ o:(EqualityOperator / RelationalOperator) __ right:Value {
		return {
			type: 'ConditionalExpression',
			left: left,
			operator: o,
			right: right
		};
	}

ComparisonExpression
  = head:ConditionalExpression tail:(__ (LogicalOROperator / LogicalANDOperator) __ ConditionalExpression)* {
      return tail.length > 0
        ? { type: "SequenceExpression", operator: extractList(tail, 1)[0], expressions: buildList(head, tail, 3) }
        : head;
    }

LogicalANDExpression
  = head:AdditiveExpression
    tail:(__ LogicalANDOperator __ AdditiveExpression)*
    { return buildLogicalExpression(head, tail); }

LogicalANDOperator
  = "&&"

LogicalORExpression
  = head:LogicalANDExpression
    tail:(__ LogicalOROperator __ LogicalANDExpression)*
    { return buildLogicalExpression(head, tail); }

LogicalOROperator
  = "||"

IfStatement
   = test:(IfIdentifier / IfNotIdentifier)
    consequent:BlockElements __
    ElseIdentifier
    alternate:BlockElements {
      return {
        type: "IfStatement",
        test: test.value,
        consequent: consequent,
        alternate: alternate,
        negate: test.negate
      };
    }
  / test:(IfIdentifier / IfNotIdentifier)
    consequent:BlockElements {
      return {
        type: "IfStatement",
        test: test.value,
        consequent: consequent,
        alternate: null,
        negate: test.negate
      };
    }

CloseStatement
  = e:CloseIdentifier {
    return {
      type: 'CloseStatement',
      value: 'endif'
    };
  }

CloseIdentifier
  = ElseIdentifier / EndifIdentifier

BlockIdentifier
  = IfIdentifier / ElseIdentifier / EndifIdentifier

IfIdentifier
  = IfToken __ "{" __ test:ComparisonExpression __ "}" __ { return { negate: false, value: test }; }
  / IfToken __ "{" __ test:(Value / ArgumentKey / Variable) __ "}" __ { return { negate: false, value: test }; }

IfNotIdentifier
  = IfToken __ "{!" __ test:ComparisonExpression __ "}" __ { return { negate: true, value: test }; }
  / IfToken __ "{!" __ test:(Value / ArgumentKey / Variable) __ "}" __ { return { negate: true, value: test }; }

ElseIdentifier
  = ElseToken __

EndifIdentifier
  = EndifToken __

ReturnStatement
  = ReturnToken __ {
    return {
      type: 'ReturnStatement'
    };
  }

BreakStatement
  = BreakToken __ {
    return {
      type: 'BreakStatement'
    }
  }

AdditiveExpression
  = head:Term tail:(__ AdditiveOperator __ Term)*
    { return buildBinaryExpression(head, tail); }

Term
  = head:Factor tail:(__ MultiplicativeOperator __ Factor)*
    { return buildBinaryExpression(head, tail); }

Factor
  = "(" __ expr:AdditiveExpression __ ")" { return expr; }
  / EnclosedMethod
  / Value

Integer "integer"
  = _ [0-9]+ { return parseInt(text(), 10); }

UnaryExpression
  = operator:UnaryOperator __ argument:UnaryExpression {
      var type = (operator === "++" || operator === "--")
        ? "UpdateExpression"
        : "UnaryExpression";

      return {
        type: type,
        operator: operator,
        argument: argument,
        prefix: true
      };
    }

// MultiplicativeExpression
//   = head:UnaryExpression
//     tail:(__ MultiplicativeOperator __ UnaryExpression)*
//     { return buildBinaryExpression(head, tail); }

// AdditiveExpression
//   = head:MultiplicativeExpression
//     tail:(__ AdditiveOperator __ MultiplicativeExpression)*
//     { return buildBinaryExpression(head, tail); }

// DoubleQuoteCharacter =
//   (!DoubleQuote) c:Character { return c; }

// SingleQuoteCharacter =
//   (!SingleQuote) c:Character { return c; }

DoubleQuoteCharacter
  = !('"' / "\\") char:. { return char; }
  / "\\" sequence:EscapeSequence { return sequence; }

SingleQuoteCharacter
  = !("'" / "\\") char:. { return char; }
  / "\\" sequence:EscapeSequence { return sequence; }

Character
  = UnescapeSequence
  / EscapeSequence

UnescapeSequence = [\x20-\x21\x23-\x5B\x5D-\u10FFFF]

EscapeSequence "escape sequence" = EscapeCharacter sequence:(
     DoubleQuote
   / SingleQuote
   / "\\"
   / "/"
   / "b" { return "\b"; }
   / "f" { return "\f"; }
   / "n" { return "\n"; }
   / "r" { return "\r"; }
   / "t" { return "\t"; }
   / "u" digits:$(HEXDIG HEXDIG HEXDIG HEXDIG) {
       return String.fromCharCode(parseInt(digits, 16));
     }
  )
  { return sequence; }

PathArgument = $([a-zA-Z_\-\$]+)

SourceCharacter
  = .

WhiteSpace "whitespace"
  = "\t"
  / "\v"
  / "\f"
  / " "
  / "\u00A0"
  / "\uFEFF"
  / Zs

CloseTokens
	= ElseToken
	/ EndifToken
	/ BreakToken

BlockTokens
	= IfToken
	/ ElseToken
	/ EndifToken
	/ BreakToken

IfToken = 'if'
ElseToken = 'else'
EndifToken = 'endif'
BreakToken = 'break'
ReturnToken = 'return'

PostfixOperator
  = "++"
  / "--"

UnaryOperator
  = "++"
  / "--"
  / $("+" !"=")
  / $("-" !"=")
  / "~"
  / "!"

RelationalOperator
  = "<="
  / ">="
  / $("<" !"<")
  / $(">" !">")

EqualityOperator
  = "==="
  / "!=="
  / "=="
  / "!="

MultiplicativeOperator
  = $("*" !"=")
  / $("/" !"=")
  / $("%" !"=")

AdditiveOperator
  = $("+" ![+=])
  / $("-" ![-=])

Any = .
ArrayOpen = __ "[" __
ArrayClose = __ "]" __
ObjectOpen = __ "{" __
ObjectClose = __ "}" __
MethodOpen = "{"
MethodClose = "}"
TupleOpen = __ "(" __
TupleClose = __ ")" __
KeyValueSeparator = __ ":" __
ValueSeprator = __ "," __
AssignmentOperator = __ "=" __

EscapeCharacter = "\\"
DoubleQuote "double quote" = '"'
SingleQuote "single quote" = "'"
HEXDIG = [0-9a-f]i