const types = require('./Types');
const { Lexer } = require('./Lexer');

module.exports.Parser = class {
    constructor(text) {
        this.lex = new Lexer(text);
        this.curNdx = undefined;
        this.tokens = undefined;
        this.parens = [];
    }

    parse() {
        this.tokens = this.lex.getTokens();
        this.curNdx = 0;

        while (true) {
            this.skipWS();
            if (this.peek() === undefined) {
                break;
            }

            this.expr();
        }

        return this.tokens;
    }

    expr() {
        this.skipWS();
        const token = this.peek();
        if (token === undefined) {
            return;
        }

        if (token.type === types.OPEN_PARENS) {
            this.sexpr();
        } else if (token.type === types.CLOSE_PARENS) {
            token.type = types.MISMATCHED_CLOSE_PARENS;
            this.consume();
        } else {
            this.consume();
        }
    }

    sexpr() {
        this.parens.push(this.peek());
        this.consume();

        while (true) {
            this.skipWS();

            if (this.peek() === undefined) {
                const token = this.parens.pop();
                token.type = types.MISMATCHED_OPEN_PARENS;
                break;
            }

            if (this.peek().type === types.CLOSE_PARENS) {
                this.parens.pop();
                this.consume();
                break;
            }

            this.expr();
        }
    }

    sexprContent() {
        switch (this.peek().type) {
            case types.DEFUN:
                return this.defun();
            case types.IN_PACKAGE:
                return this.inPackage();
            case types.DEFPACKAGE:
                return this.defPackage();
            case types.LOAD:
                return this.load();
        }
    }

    load() {
        this.consume();
        while (this.peek() !== undefined && this.peek().type !== types.CLOSE_PARENS) {
            this.consume();
        }
    }

    defPackage() {
        this.consume();
        this.skipWS();

        let token = this.peek();
        if (token.type !== types.SYMBOL) {
            return;
        }

        this.consume();
        token.type = types.PACKAGE_NAME;

        this.defPackageBody();
    }

    defPackageBody() {
        while (true) {
            this.skipWS();
            if (this.peek().type !== types.OPEN_PARENS) {
                return;
            }

            this.consume();
            while (this.peek() !== undefined && this.peek().type !== types.CLOSE_PARENS) {
                this.consume();
            }

            this.consume();
        }
    }

    inPackage() {
        this.consume();
        this.skipWS();

        let token = this.peek();
        if (token.type !== types.SYMBOL) {
            return;
        }
        this.consume();

        token.type = types.PACKAGE_NAME;
    }

    defun() {
        this.consume();
        this.skipWS();

        let token = this.peek();
        if (token.type !== types.ID) {
            return;
        }

        token.type = types.FUNCTION;
        this.consume();
        this.skipWS();

        token = this.peek();
        if (token.type !== types.OPEN_PARENS) {
            return;
        }

        this.paramList();
        this.defunBody();
    }

    defunBody() {
        while (true) {
            this.skipWS();

            if (this.peek() !== undefined && this.peek().type !== types.CLOSE_PARENS) {
                break;
            }

            const token = this.peek();

            if (token.type === OPEN_PARENS) {
                this.sexpr();
            } else {
                this.consume();
            }
        }
    }

    paramList() {
        this.consume();

        while (this.peek() !== undefined && this.peek().type !== types.CLOSE_PARENS) {
            this.peek().type = types.PARAMETER;
            this.consume();
        }

        this.consume();
    }

    skipWS() {
        while (this.peek() !== undefined && this.peek().type === types.WHITE_SPACE) {
            this.consume();
        }
    }

    peek() {
        if (this.curNdx >= this.tokens.length) {
            return undefined;
        }

        return this.tokens[this.curNdx];
    }

    consume() {
        if (this.curNdx >= this.tokens.length) {
            return;
        }

        this.curNdx += 1;
    }
};
