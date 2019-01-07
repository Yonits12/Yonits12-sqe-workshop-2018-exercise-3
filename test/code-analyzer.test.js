import assert from 'assert';
import {parseCode, exportComponents, parseInputs, prepareEvaluate, evaluateComponents, dot} from '../src/js/code-analyzer';
import $ from 'jquery';

describe('The javascript parser', () => {
    it('is parsing an empty program correctly', () => {
        assert.equal(JSON.stringify(parseCode('')),
            '{"type":"Program","body":[],"sourceType":"script","range":[0,0]' +
            ',"loc":{"start":{"line":0,"column":0},"end":{"line":0,"column":0}}}'
        );
    });
    it('is parsing a simple variable declaration correctly', () => {
        assert.equal(
            JSON.stringify(parseCode('let a = 1;')),
            '{"type":"Program","body":[{"type":"VariableDeclaration",' +
            '"declarations":[{"type":"VariableDeclarator","id":{"type":' +
            '"Identifier","name":"a","range":[4,5],"loc":{"start":{"line"' +
            ':1,"column":4},"end":{"line":1,"column":5}}},"init":{"type":' +
            '"Literal","value":1,"raw":"1","range":[8,9],"loc":{"start":' +
            '{"line":1,"column":8},"end":{"line":1,"column":9}}},"range":' +
            '[4,9],"loc":{"start":{"line":1,"column":4},"end":{"line":1,' +
            '"column":9}}}],"kind":"let","range":[0,10],"loc":{"start":' +
            '{"line":1,"column":0},"end":{"line":1,"column":10}}}],' +
            '"sourceType":"script","range":[0,10],"loc":{"start":{"line"' +
            ':1,"column":0},"end":{"line":1,"column":10}}}'
        );
    });
    it('is parsing an empty function with return statement correctly', () => {
        assert.equal(JSON.stringify(parseCode('function foo(){ return 1; }')),
            '{"type":"Program","body":[{"type":"FunctionDeclaration","id":{"type":' +
            '"Identifier","name":"foo","range":[9,12],"loc":{"start":{"line":1,' +
            '"column":9},"end":{"line":1,"column":12}}},"params":[],"body":{"type":' +
            '"BlockStatement","body":[{"type":"ReturnStatement","argument":{"type":' +
            '"Literal","value":1,"raw":"1","range":[23,24],"loc":{"start":{"line":' +
            '1,"column":23},"end":{"line":1,"column":24}}},"range":[16,25],"loc":' +
            '{"start":{"line":1,"column":16},"end":{"line":1,"column":25}}}],"range":' +
            '[14,27],"loc":{"start":{"line":1,"column":14},"end":{"line":1,"column":27}}}' +
            ',"generator":false,"expression":false,"async":false,"range":[0,27],"loc":' +
            '{"start":{"line":1,"column":0},"end":{"line":1,"column":27}}}],"sourceType":' +
            '"script","range":[0,27],"loc":{"start":{"line":1,"column":0},"end":{"line":1,"column":27}}}'
        );
    });
    it('simple funtion check dot', () => {
        exportComponents(parseCode('function foo(x){}'));
        let temp_dot = dot;
        assert.equal(temp_dot,
            'n0 [label="entry", style="rounded"]\nn1 [label="exit", style="rounded"]\nn0 -> n1 []\n'
        );
    });
    it('simple funtion with local vars and return check dot', () => {
        exportComponents(parseCode('function foo(x, y, z){\n' +
            '   let a = x + 1;\n' +
            '   let b = a + y;\n' +
            '   let c = 0;\n' +
            '   return z;\n' +
            '}'));
        let temp_dot = dot;
        assert.equal(temp_dot,
            'n0 [label="entry", style="rounded"]\nn1 [label="let a = x + 1;"]\nn2 ' +
            '[label="let b = a + y;"]\nn3 [label="let c = 0;"]\nn4 [label="return z;"]\nn5 [label="exit", style="ro' +
            'unded"]\nn0 -> n1 []\nn1 -> n2 []\nn1 -> n5 [color="red", label="exception"]\nn2 -> n3 ' +
            '[]\nn2 -> n5 [color="red", label="exception"]\nn3 -> n4 []\nn4 -> n5 []\n'
        );
    });
    it('simple funtion with while and if check dot', () => {
        exportComponents(parseCode('function foo(x, y, z){\n' +
            '   let a = x + 1;\n' +
            '   let b = a + y;\n' +
            '   let c = 0;\n' +
            '   \n' +
            '   while (a < 4) {\n' +
            '       c = a + b;\n' +
            '       z = c * 2;\n' +
            '       a = a + 1;\n' +
            '       if(a > 0){\n' +
            '          a++;\n' +
            '       }\n' +
            '   }\n' +
            '   if (b < z) {\n' +
            '        c = c + 5;\n' +
            '    } else if (b < z * 2) {\n' +
            '        c = c + x + 5;\n' +
            '    } else {\n' +
            '        c = c + z + 5;\n' +
            '    }\n' +
            '\n' +
            '\n' +
            '   return z;\n' +
            '}'));
        let temp_dot = dot;
        assert.equal(temp_dot, 'n0 [label="entry", style="rounded"]\nn1 [label="let a = x + 1;"]' +
            '\nn2 [label="let b = a + y;"]\nn3 [label="let c = 0;"]\nn4 [label="a < 4"]\nn5 ' +
            '[label="c = a + b"]\nn6 [label="z = c * 2"]\nn7 [label="a = a + 1"]\nn8 [label="a' +
            ' > 0"]\nn9 [label="a++"]\nn10 [label="b < z"]\nn11 [label="c = c + 5"]\nn12 ' +
            '[label="return z;"]\nn13 [label="b < z * 2"]\nn14 [label="c = c + x + 5"]\nn15 ' +
            '[label="c = c + z + 5"]\nn16 [label="exit", style="rounded"]\nn0 -> n1 []\nn1 -> n2 []' +
            '\nn1 -> n16 [color="red", label="exception"]\nn2 -> n3 []\nn2 -> n16 [color="red", ' +
            'label="exception"]\nn3 -> n4 []\nn4 -> n5 [label="true"]\nn4 -> n10 [label="false"]\nn4' +
            ' -> n16 [color="red", label="exception"]\nn5 -> n6 []\nn5 -> n16 [color="red", label="exception"]' +
            '\nn6 -> n7 []\nn6 -> n16 [color="red", label="exception"]\nn7 -> n8 []\nn7 -> n16 ' +
            '[color="red", label="exception"]\nn8 -> n9 [label="true"]\nn8 -> n4 [label="false"]\n' +
            'n8 -> n16 [color="red", label="exception"]\nn9 -> n4 []\nn10 -> n11 [label="true"]\nn10 ' +
            '-> n13 [label="false"]\nn10 -> n16 [color="red", label="exception"]\nn11 -> n12 []\nn11 ->' +
            ' n16 [color="red", label="exception"]\nn12 -> n16 []\nn13 -> n14 [label="true"]\nn13 -> n15' +
            ' [label="false"]\nn13 -> n16 [color="red", label="exception"]\nn14 -> n12 []\nn14 -> n16 ' +
            '[color="red", label="exception"]\nn15 -> n12 []\nn15 -> n16 [color="red", label="exception"]\n'
        );
    });
    it('simple funtion with lets and return check greened dot', () => {
        let readyToGraphJson = exportComponents(parseCode('function foo(x, y, z){\n' +
            '   let a = x + 1;\n' +
            '   let b = a + y;\n' +
            '   let c = 0;\n' +
            '   return z;\n' +
            '}'));
        parseInputs('1,2,3');
        evaluateComponents(prepareEvaluate(readyToGraphJson));
        let temp_dot = dot;
        assert.equal(temp_dot,
            'n0 [label="entry", style="rounded"]\nn1 [label="let a = x + 1;",' +
            ' color="Green", style="filled"]\nn2 [label="let b = a + y;", color' +
            '="Green", style="filled"]\nn3 [label="let c = 0;", color="Green", ' +
            'style="filled"]\nn4 [label="return z;", color="Green", style="filled"]' +
            '\nn5 [label="exit", style="rounded"]\nn0 -> n1 []\nn1 -> n2 []\nn1 -> ' +
            'n5 [color="red", label="exception"]\nn2 -> n3 []\nn2 -> n5 [color="red"' +
            ', label="exception"]\nn3 -> n4 []\nn4 -> n5 []\n'
        );
    });
    it('simple funtion with lets and while and return check greened dot', () => {
        let readyToGraphJson = exportComponents(parseCode('function foo(x, y, z){\n' +
            '   let a = x + 1;\n' +
            '   let b = a + y;\n' +
            '   let c = 0;\n' +
            '   \n' +
            '   while (a < 4) {\n' +
            '       c = a + b;\n' +
            '       z = c * 2;\n' +
            '       a = a + 1;\n' +
            '       if(a > 0){\n' +
            '          a++;\n' +
            '       }\n' +
            '   }\n' +
            '\n' +
            '   return z;\n' +
            '}'));
        parseInputs('1,2,3');
        evaluateComponents(prepareEvaluate(readyToGraphJson));
        let temp_dot = dot;
        assert.equal(temp_dot,
            'n0 [label="entry", style="rounded"]\nn1 [label="let a = x + 1;", color="Green", style="filled"' +
            ']\nn2 [label="let b = a + y;", color="Green", style="filled"]\nn3 [label="let c = 0;", color' +
            '="Green", style="filled"]\nn4 [label="a < 4", color="Green", style="filled", shape="diamond"' +
            ']\nn5 [label="c = a + b", color="Green", style="filled"]\nn6 [label="z = c * 2", color="Green' +
            '", style="filled"]\nn7 [label="a = a + 1", color="Green", style="filled"]\nn8 [label="a > 0"' +
            ', color="Green", style="filled", shape="diamond"]\nn9 [label="a++", color="Green", style="filled"' +
            ']\nn10 [label="return z;", color="Green", style="filled"]\nn11 [label="exit", style="rounded"]\n' +
            'n0 -> n1 []\nn1 -> n2 []\nn1 -> n11 [color="red", label="exception"]\nn2 -> n3 []\nn2 -> n11 [color' +
            '="red", label="exception"]\nn3 -> n4 []\nn4 -> n5 [label="true"]\nn4 -> n10 [label="false"]\nn4 -> ' +
            'n11 [color="red", label="exception"]\nn5 -> n6 []\nn5 -> n11 [color="red", label="exception"]\nn6 ->' +
            ' n7 []\nn6 -> n11 [color="red", label="exception"]\nn7 -> n8 []\nn7 -> n11 [color="red", label="exce' +
            'ption"]\nn8 -> n9 [label="true"]\nn8 -> n4 [label="false"]\nn8 -> n11 [color="red", label="exception"]' +
            '\nn9 -> n4 []\nn10 -> n11 []\n'
        );
    });
    it('simple funtion with lets and if and return check greened dot', () => {
        exportComponents(parseCode('function foo(x, y, z){\n' +
            '   let a = x + 1;\n' +
            '   let b = a + y;\n' +
            '   let c = 0;\n' +
            '   \n' +
            '   if (b < z) {\n' +
            '        c = c + 5;\n' +
            '    } else if (b < z * 2) {\n' +
            '        c = c + x + 5;\n' +
            '    } else {\n' +
            '        c = c + z + 5;\n' +
            '    }\n' +
            '\n' +
            '\n' +
            '   return z;\n' +
            '}'));
        let temp_dot = dot;
        assert.equal(temp_dot,
            'n0 [label="entry", style="rounded"]\nn1 [label="let a = x + 1;"]\nn2 [label="let b = a + y;"]\nn3 [label' +
            '="let c = 0;"]\nn4 [label="b < z"]\nn5 [label="c = c + 5"]\nn6 [label="return z;"]\nn7 [label="b < z * 2"]' +
            '\nn8 [label="c = c + x + 5"]\nn9 [label="c = c + z + 5"]\nn10 [label="exit", style="rounded"]\nn0 -> n1 []' +
            '\nn1 -> n2 []\nn1 -> n10 [color="red", label="exception"]\nn2 -> n3 []\nn2 -> n10 [color="red", label="exce' +
            'ption"]\nn3 -> n4 []\nn4 -> n5 [label="true"]\nn4 -> n7 [label="false"]\nn4 -> n10 [color="red", label="excep' +
            'tion"]\nn5 -> n6 []\nn5 -> n10 [color="red", label="exception"]\nn6 -> n10 []\nn7 -> n8 [label="true"]\nn7' +
            ' -> n9 [label="false"]\nn7 -> n10 [color="red", label="exception"]\nn8 -> n6 []\nn8 -> n10 [color="red", la' +
            'bel="exception"]\nn9 -> n6 []\nn9 -> n10 [color="red", label="exception"]\n'
        );
    });
    it('Complex funtion greened dot', () => {
        let readyToGraphJson = exportComponents(parseCode('function foo(x, y, z){\n' +
            '   let a = x + 1;\n' +
            '   let b = a + y;\n' +
            '   let c = 0;\n' +
            '   \n' +
            '   while (a < 4) {\n' +
            '       c = a + b;\n' +
            '       z = c * 2;\n' +
            '       a = a + 1;\n' +
            '       if(a > 0){\n' +
            '          a++;\n' +
            '       }\n' +
            '   }\n' +
            '   if (b < z) {\n' +
            '        c = c + 5;\n' +
            '    } else if (b < z * 2) {\n' +
            '        c = c + x + 5;\n' +
            '    } else {\n' +
            '        c = c + z + 5;\n' +
            '    }\n' +
            '\n' +
            '\n' +
            '   return z;\n' +
            '}'));
        parseInputs('1,2,3');
        evaluateComponents(prepareEvaluate(readyToGraphJson));
        let temp_dot = dot;
        assert.equal(temp_dot,
            'n0 [label="entry", style="rounded"]\nn1 [label="let a = x + 1;", color="Green",' +
            ' style="filled"]\nn2 [label="let b = a + y;", color="Green", style="filled"]\nn3' +
            ' [label="let c = 0;", color="Green", style="filled"]\nn4 [label="a < 4", color="Green",' +
            ' style="filled", shape="diamond"]\nn5 [label="c = a + b", color="Green", style="filled"]\nn6' +
            ' [label="z = c * 2", color="Green", style="filled"]\nn7 [label="a = a + 1", color="Green", ' +
            'style="filled"]\nn8 [label="a > 0", color="Green", style="filled", shape="diamond"]\nn9 ' +
            '[label="a++", color="Green", style="filled"]\nn10 [label="b < z", color="Green", style="filled", ' +
            'shape="diamond"]\nn11 [label="c = c + 5", color="Green", style="filled"]\nn12 [label="return z;", ' +
            'color="Green", style="filled"]\nn13 [label="b < z * 2"]\nn14 [label="c = c + x + 5"]\nn15 ' +
            '[label="c = c + z + 5"]\nn16 [label="exit", style="rounded"]\nn0 -> n1 []\nn1 -> n2 []\nn1 -> n16 ' +
            '[color="red", label="exception"]\nn2 -> n3 []\nn2 -> n16 [color="red", label="exception"]\nn3 -> n4 ' +
            '[]\nn4 -> n5 [label="true"]\nn4 -> n10 [label="false"]\nn4 -> n16 [color="red", label="exception"]' +
            '\nn5 -> n6 []\nn5 -> n16 [color="red", label="exception"]\nn6 -> n7 []\nn6 -> n16 [color="red", ' +
            'label="exception"]\nn7 -> n8 []\nn7 -> n16 [color="red", label="exception"]\nn8 -> n9 [label="true"]' +
            '\nn8 -> n4 [label="false"]\nn8 -> n16 [color="red", label="exception"]\nn9 -> n4 []\nn10 -> n11 ' +
            '[label="true"]\nn10 -> n13 [label="false"]\nn10 -> n16 [color="red", label="exception"]\nn11 -> n12 ' +
            '[]\nn11 -> n16 [color="red", label="exception"]\nn12 -> n16 []\nn13 -> n14 [label="true"]\nn13 -> n15 ' +
            '[label="false"]\nn13 -> n16 [color="red", label="exception"]\nn14 -> n12 []\nn14 -> n16 [color="red", ' +
            'label="exception"]\nn15 -> n12 []\nn15 -> n16 [color="red", label="exception"]\n'
        );
    });
});
