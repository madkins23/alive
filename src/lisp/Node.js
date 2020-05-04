const types = require('../Types');
const { Atom, DefPackage, Defun, If, InPackage } = require('./Expr');

module.exports.Node = class {
    constructor() {
        this.kids = [];
        this.open = undefined;
        this.close = undefined;
        this.value = undefined;
    }

    toExpr() {
        if (this.value !== undefined) {
            return this.toAtomExpr();
        }

        return this.toSexpr();
    }

    toAtomExpr() {
        return this.value.type !== types.WHITE_SPACE
            ? new Atom(this.value.start, this.value.end, this.value.text)
            : undefined;
    }

    toSexpr() {
        const kids = this.removeWS(this.kids);
        if (kids === undefined || kids.length === 0) {
            return undefined;
        }

        if (kids[0].value === undefined) {
            console.log('Node.toExpr first child has no value');
            return undefined;
        }

        switch (kids[0].value.text) {
            case 'DEFPACKAGE':
                return this.toDefPackageExpr(kids);
            case 'DEFUN':
                return this.toDefunExpr(kids);
            case 'IF':
                return this.toIfExpr(kids);
            case 'IN-PACKAGE':
                return this.toInPackageExpr(kids);
            default:
                console.log(`NEED TO CONVERT ${kids[0].value.text}`);
        }

        return undefined;
    }

    toIfExpr(kids) {
        const cond = kids[1].toExpr();
        const trueExpr = kids.length > 2 ? kids[2].toExpr() : undefined;
        const falseExpr = kids.length > 3 ? kids[2].toExpr() : undefined;

        return new If(this.open.start, this.close.end, cond, trueExpr, falseExpr);
    }

    toDefunExpr(kids) {
        const name = kids[1].value !== undefined ? kids[1].value.text : undefined;
        const args = this.toList(kids[2]);
        const body = [];

        for (let ndx = 3; ndx < kids.length; ndx += 1) {
            const node = kids[ndx];
            const expr = node.toExpr();

            if (expr !== undefined) {
                body.push(expr);
            }
        }

        return new Defun(this.open.start, this.close.end, name, args, body);
    }

    toList(node) {
        const items = [];

        for (let ndx = 0; ndx < node.kids.length; ndx += 1) {
            const item = node.kids[ndx];

            if (item.value === undefined) {
                continue;
            }

            items.push(item.value.text);
        }

        return items;
    }

    toInPackageExpr(kids) {
        if (kids.length < 2 || kids[1].value === undefined) {
            return undefined;
        }

        const name = this.convertName(kids[1].value);

        return new InPackage(this.open.start, this.close.end, name);
    }

    toDefPackageExpr(kids) {
        const name = this.packageName(kids[1].value);
        let uses = undefined;
        let exports = undefined;

        for (let ndx = 2; ndx < kids.length; ndx += 1) {
            const kid = kids[ndx];

            if (this.isChildExpr(kid, ':USE')) {
                uses = this.getSymbolList(kid);
                this.convertUsesList(uses);
            } else if (this.isChildExpr(kid, ':EXPORT')) {
                exports = this.getSymbolList(kid);
            }
        }

        return new DefPackage(this.open.start, this.close.end, name, uses, exports);
    }

    convertUsesList(list) {
        for (let ndx = 0; ndx < list.length; ndx += 1) {
            const item = list[ndx];

            if (item === 'CL' || item === 'COMMON-LISP' || item === 'COMMON-LISP-USER') {
                list[ndx] = 'CL-USER';
            }
        }
    }

    getSymbolList(node) {
        const list = [];

        for (let ndx = 1; ndx < node.kids.length; ndx += 1) {
            if (node.kids[ndx].value !== undefined) {
                list.push(this.convertName(node.kids[ndx].value));
            }
        }

        return list;
    }

    isChildExpr(node, name) {
        if (node.kids.length === 0 || node.kids[0].value === undefined) {
            return false;
        }

        return node.kids[0].value.text === name;
    }

    packageName(token) {
        let name = this.convertName(token);

        if (name === 'COMMON-LISP-USER') {
            name = 'CL-USER';
        }

        return name;
    }

    convertName(token) {
        return (token.type == types.SYMBOL) ? token.text.substring(1) : token.text;
    }

    removeWS(kids) {
        const out = [];

        kids.forEach(node => {
            if (node.value !== undefined && node.value.type !== types.WHITE_SPACE) {
                out.push(node);
            } else if (node.kids.length > 0) {
                node.kids = this.removeWS(node.kids);
                out.push(node);
            }
        });

        return out;
    }
};
