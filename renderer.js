/*
 * イベントハンドラーの登録
 */
const FORM = document.getElementById("form");
const INPUT = document.getElementById("input");
const RESULT = document.getElementById("result");
const PREFIX = document.getElementById("prefix");
const SUFFIX = document.getElementById("suffix");

FORM.onsubmit = () => {
  if (INPUT.value === '') {
    return false;
  }

  let __result = 'NaN';
  const calculator = new Calculator(INPUT.value);
  try {
    __result = calculator.Execute();
  }
  catch (error) {
    console.error(error);
    return false;
  }

  RESULT.value = String(__result);
  return false;
};

/*
 * 構文木
 */
class Tree {
  constructor(val, left, right) {
    let obj = {};

    obj.val = val;
    obj.right = right ? right : null;
    obj.left = left ? left : null;
    /* 構文木の幹であるか否か */
    obj.isStem = obj.right !== null && obj.left !== null;

    return obj;
  }
}

/*
 * 計算機
 */
class Calculator {
  /* 演算子の計算関数、および、優先度 */
  operator = {
    '+': {
      func: (x, y) => this.Number(x) + this.Number(y),
      priority: 1,
    },
    '-': {
      func: (x, y) => this.Number(x) - this.Number(y),
      priority: 1,
    },
    '*': {
      func: (x, y) => this.Number(x) * this.Number(y),
      priority: 2,
    },
    '/': {
      func: (x, y) => this.Number(x) / this.Number(y),
      priority: 2,
    },
    '^': {
      func: (x, y) => this.Number(x) ** this.Number(y),
      priority: 2,
    },
  };
  /* 進数 */
  base = {
    '0x': {
      func: (x) => BigInt('0x' + x),
      rex: /^[0-9a-fA-F]+$/,
    },
    '': {
      func: (x) => BigInt(x),
      rex: /^[0-9]+$/,
    },
    '0o': {
      func: (x) => BigInt('0o' + x),
      rex: /^[0-7]+$/,
    },
    '0b': {
      func: (x) => BigInt('0b' + x),
      rex: /^[0-1]+$/,
    },
  };
  /* 単位 */
  unit = {
    'T': {
      func: (x) => BigInt(x) * (BigInt(2) ** BigInt(40)),
    },
    'G': {
      func: (x) => BigInt(x) * (BigInt(2) ** BigInt(30)),
    },
    'M': {
      func: (x) => BigInt(x) * (BigInt(2) ** BigInt(20)),
    },
    'K': {
      func: (x) => BigInt(x) * (BigInt(2) ** BigInt(10)),
    },
    '': {
      func: (x) => BigInt(x),
    },
  };
  /* コンストラクター */
  constructor(input) {
    this.input = input;
  }

  /* 文字列を演算可能な数字に変換する */
  Number(input) {
    /* 入力値が文字列の場合は、変換済みのため処理しない */
    if (typeof input !== 'string') {
      return input;
    }

    let number = input.substr(0);

    /* 進数プレフィックスの抽出 */
    let prefix = ''; /* 0x 0o 0b など */
    const prefix_length = 2;
    if (number.length > prefix_length) {
      const keys = Object.keys(this.base);
      const str = number.substr(0, prefix_length).toLowerCase();
      if (keys.includes(str)) {
        prefix = str;
        number = number.substr(prefix_length);
      }
    }

    /* 単位サフィックスの抽出 */
    let suffix = ''; /* T G M K など */
    const suffix_length = 1;
    if (number.length > suffix_length) {
      const keys = Object.keys(this.unit);
      const str = number.substr(-suffix_length).toUpperCase();
      if (keys.includes(str)) {
        suffix = str;
        number = number.substr(0, number.length - suffix_length);
      }
    }

    /* 数字部分の書式チェック */
    if (number.search(this.base[prefix].rex) === -1) {
      throw `'${input}' is invalid format.`;
    }

    let output = this.unit[suffix].func(number);
    output = this.base[prefix].func(output);

    return BigInt(output);
  }

  /* 入力文字列を解析して計算結果を返す */
  Execute() {
    const tokens = this.#tokenizer(this.input);
    const tree = this.parser(tokens);
    const result = this.#traverse(tree);

    return result;
  }

  // 構文木を解釈して計算結果を返す関数
  #traverse(tree) {
    /* 幹の場合は再帰的に計算する */
    if (tree.isStem) {
      return new Tree(
        this.operator[tree.val].func(
          this.#traverse(tree.left),
          this.#traverse(tree.right)
        )
      ).val;
    }
    /* 葉の場合は整数化した値を返す */
    return this.Number(tree.val);
  }

  /* 字句解析 */
  #tokenizer(input) {
    const keys = [...Object.keys(this.operator), '(', ')'];
    keys.forEach(key => {
      input = input.replaceAll(key, ` ${key} `);
    });
    console.log(input.trim().split(/\s+/));
    return input.trim().split(/\s+/);
  }

  /* トークンから構文木を組み立てる */
  parser(tokens) {
    if (tokens.length === 0) {
      return null;
    }
    if (tokens.length === 1) {
      return new Tree(tokens[0]);
    }

    /* 両端の不要括弧を削除 */
    while (tokens.indexOf('(') === 0 && tokens.lastIndexOf(')') === tokens.length - 1) {
      tokens = tokens.slice(1, tokens.length - 1);
    }

    const point = this.branch(tokens);
    const left = tokens.slice(0, point);
    const right = tokens.slice(point + 1, tokens.length);

    return new Tree(tokens[point], this.parser(left), this.parser(right));
  };

  /* 構文木の分岐点を探す */
  branch(tokens) {
    let depth = 0;
    let point = 0;
    let minPriority = Infinity;

    for (let index = 0; index < tokens.length; index++) {
      const str = tokens[index];
      if (str === '(') {
        depth++;
      }
      if (str === ')') {
        depth--;
      }
      if (depth !== 0) {
        continue;
      }
      if (this.operator[str]?.priority <= minPriority) {
        point = index;
        minPriority = this.operator[str].priority;
      }
    }

    return point;
  }
}
