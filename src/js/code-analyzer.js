import * as esprima from 'esprima';
import * as escodgen from 'escodegen';
const esgraph = require('esgraph');


var global = [];
var environment = [];
var codeString;
var env = {};
var params_glob = [];
var outputCode = '';
var lines;
var dot;
var globalParsedCode;


const parseCode = (codeToParse) => {
    global = [];
    environment = [];
    params_glob = [];
    codeString = codeToParse;
    globalParsedCode = esprima.parseScript(codeToParse, {loc: true, range: true});
    return globalParsedCode;

};

/*function handlePropertyToEdit(lines, element_properties, properties, propertyToEdit){
    for(let idx in properties) {
        if(properties[idx].split(/=(.+)/)[0] == propertyToEdit.split(/=(.+)/)[0]) {
            properties[idx] = propertyToEdit;
        }
    }
    element_properties = '[' + properties.join(', ') + ']';
    return element_properties;
}*/


function editElementProperty(elementNum, propertyToAdd, propertyToEdit){
    var lines = dot.split('\n');
    var element_properties = lines[elementNum].split(/ (.+)/)[1];
    var properties = element_properties.substring(1,element_properties.length-1).split(', ');
    if(propertyToAdd.length > 0) {
        for(let idx in properties) {
            if (properties[idx].split(/=(.+)/)[0] == propertyToAdd.split(/=(.+)/)[0]) {
                return propertyToEdit;
            }
        }
        element_properties = element_properties.substring(0,element_properties.length-1) + ', ' + propertyToAdd + ']';
    }
    /*else {
        element_properties = handlePropertyToEdit(lines, element_properties, properties, propertyToEdit);
    }*/
    lines[elementNum] = lines[elementNum].split(/ (.+)/)[0] + ' ' + element_properties;
    dot = lines.join('\n');
}

function getGraphIdx(stringOfJson){
    var lines = dot.split('\n');
    for(let line_idx in lines){
        var element_properties = lines[line_idx].split(/ (.+)/)[1];
        var properties = element_properties.substring(1,element_properties.length-1).split(', ');
        for(let idx in properties) {
            if(properties[idx].split(/=(.+)/)[0] == 'label') {
                if(properties[idx].split(/=(.+)/)[1] == ('"' + stringOfJson + '"')){
                    //return the number of n__ in this line
                    return line_idx;
                }
            }
        }
    }
    return -1;
}

function setenvironment(value) {
    environment = JSON.parse(JSON.stringify(value));
}

function setoutputCode(value) {
    outputCode = value;
}


function val_of_init_helper(parsedVarDecl, i){
    var val_of_init;
    val_of_init = codeString.substring(parsedVarDecl.declarations[i].init.range[0], parsedVarDecl.declarations[i].init.range[1]);
    return val_of_init;
}


function functionExporter(parsedFuncDecl){
    const funcStruct = {
        'Line': parsedFuncDecl.loc.start.line.toString(),
        'Type': parsedFuncDecl.type,
        'Name': parsedFuncDecl.id.name,
        'Condition': '',
        'Value': ''};
    global.push(funcStruct);
    exportIdentifiers(parsedFuncDecl.params);
    for(let idx in parsedFuncDecl.body.body){
        parsedFuncDecl.body.body[idx] = exportComponents(parsedFuncDecl.body.body[idx]);
    }
    return parsedFuncDecl;
}

function returnExporter(parsedRetStat) {
    var substiutedJSON = parsedRetStat;
    //.argument = ensureSubtitutionJSON(parsedRetStat.argument);
    const retStruct = {
        'Line': parsedRetStat.loc.start.line.toString(),
        'Type': parsedRetStat.type,
        'Name': '',
        'Condition': '',
        'Value':  parsedRetStat.argument, // ensureSubtitution(parsedRetStat.argument),
        'json_Val': substiutedJSON.argument};
    global.push(retStruct);
    substiutedJSON['graph_index'] = getGraphIdx(escodgen.generate(parsedRetStat));
    return substiutedJSON;
}


function alternate_exporter(alternate) {
    if(alternate.type == 'IfStatement')
        return ifExporter(alternate, 'ElseType');
    /*else if(alternate.type != 'BlockStatement')
        return exportComponents(alternate);*/
    else {
        for (let idx1 in alternate.body) {
            alternate.body[idx1] = exportComponents(alternate.body[idx1]);
        }
        return alternate;
    }

}
/*function giveMeTheFuSTR(jsonExp){
    if(jsonExp.type == 'BinaryExpression'){
        return giveMeTheFuSTR(jsonExp.left) + ' ' + jsonExp.operator  + ' ' + giveMeTheFuSTR(jsonExp.right);
    }
    else if(jsonExp.type == 'Literal'){
        return jsonExp.raw;
    }
    else{
        return jsonExp.name;
    }
}*/
function assignmentExporter(parsedAssStat) {
    var value_str = codeString.substring(parsedAssStat.right.range[0], parsedAssStat.right.range[1]);
    /*if(parsedAssStat.loc.start.line == 1){
        value_str = giveMeTheFuSTR(parsedAssStat.right);
    }*/
    const assStruct = {
        'Line': parsedAssStat.loc.start.line.toString(),
        'Type': parsedAssStat.type,
        'Name': parsedAssStat.left.name,
        'Condition': '',
        'Value': value_str};
    global.push(assStruct);
    // pass over the global, find the Var decl of this assignment and replace the Value with the assignment.
    //parsedAssStat.right = replaceValOfVar(assStruct.Name, parsedAssStat.right);
    // if there is no use of var outside current block - remove it.
    parsedAssStat['graph_index'] = getGraphIdx(escodgen.generate(parsedAssStat));
    return parsedAssStat;
}


function updateExporter(parsedUpdateStat){
    var var_name = codeString.substring(parsedUpdateStat.range[0], parsedUpdateStat.range[0]+1);
    var operator = codeString.substring(parsedUpdateStat.range[0], parsedUpdateStat.range[1]).substring(1,2);
    const upStruct = {
        'Line': parsedUpdateStat.loc.start.line.toString(),
        'Type': parsedUpdateStat.type,
        'Name': parsedUpdateStat.argument.name,
        'Condition': '',
        'Value': var_name + ' = ' + var_name + ' ' + operator + ' 1'};
    global.push(upStruct);
    var newAssJson = esprima.parseScript(upStruct.Value, {loc: true, range: true}).body[0].expression;
    //newAssJson.right = replaceValOfVar(upStruct.Name, newAssJson.right);
    newAssJson['graph_index'] = getGraphIdx(escodgen.generate(parsedUpdateStat));
    return newAssJson;
}
const expStatmentFuncDirector = {
    'AssignmentExpression': assignmentExporter,
    'UpdateExpression': updateExporter
};
function expressionExporter(parsedCode){
    var exp_json = parsedCode;
    exp_json.expression = expStatmentFuncDirector[parsedCode.expression.type](parsedCode.expression);
    return exp_json;
}

/*
function expressionExporterGlob(parsedCode){
    var exp_json = parsedCode;
    exp_json.expression = expStatmentFuncDirector[parsedCode.expression.type](parsedCode.expression);
    return exp_json;
}
*/

function whileExporter(parsedWhileCode){
    parsedWhileCode['graph_index'] = getGraphIdx(escodgen.generate(parsedWhileCode.test));
    const whileStruct = {
        'Line': parsedWhileCode.loc.start.line.toString(),
        'Type': parsedWhileCode.type,
        'Name': '',
        'Condition': parsedWhileCode.test,//ensureSubtitution(parsedWhileCode.test), //codeString.substring(parsedWhileCode.test.range[0], parsedWhileCode.test.range[1]),
        'Value': ''};
    global.push(whileStruct);
    //parsedWhileCode.test = ensureSubtitutionJSON(parsedWhileCode.test);
    var env_temp = JSON.parse(JSON.stringify(environment)); //$.extend(true, [], environment);
    consequent_exporter(parsedWhileCode.body);
    environment = JSON.parse(JSON.stringify(env_temp));//$.extend(true, [], env_temp);
    return parsedWhileCode;
}



const parseFunctionDirector = {
    'VariableDeclaration': variableExporter,
    /*'VariableDeclarationGlob': variableExporterGlob,*/
    'FunctionDeclaration': functionExporter,
    'ExpressionStatement': expressionExporter,
    /*'ExpressionStatementGlob': expressionExporterGlob,*/
    'AssignmentExpression': assignmentExporter,/*
    'AssignmentExpressionGlob': assignmentExporterGlob,*//*
    'UpdateExpression': updateExporter,*/
    'WhileStatement': whileExporter,
    'IfStatement': ifExporter,
    'ReturnStatement': returnExporter/*,
    'ForStatement': forExporter*/
};

/*function literalSubstituter(parsedExp) {
    return parsedExp.raw;
}*/
/*
function unaryExpSubstituter(parsedExp) {
    return parsedExp.operator + expSubstituteDirector[parsedExp.argument.type](parsedExp.argument);
}
function memberExpSubstituter(parsedExp) {
    var arrNameAfterSub = expSubstituteDirector[parsedExp.object.type](parsedExp.object);
    var propertyAfterSub = expSubstituteDirector[parsedExp.property.type](parsedExp.property);
    return arrNameAfterSub + '[' + propertyAfterSub + ']';
}


function literalSubstituterJSON(parsedExp) {
    return parsedExp;
}
function unaryExpSubstituterJSON(parsedExp) {
    var clone = parsedExp;
    clone.argument = expSubstituteDirectorJSON[parsedExp.argument.type](parsedExp.argument);
    return clone;
}
function binaryExpSubstituterJSON(parsedExp) {
    var clone = parsedExp;
    clone.left = expSubstituteDirectorJSON[parsedExp.left.type](parsedExp.left);
    clone.right = expSubstituteDirectorJSON[parsedExp.right.type](parsedExp.right);
    return clone;
}

function memberExpSubstituterJSON(parsedExp) {
    var clone = parsedExp;
    clone.object = expSubstituteDirectorJSON[parsedExp.object.type](parsedExp.object);
    clone.property = expSubstituteDirectorJSON[parsedExp.property.type](parsedExp.property);
    return clone;
}
*/


/*const expSubstituteDirector = {
    'Identifier': identifierSubstituter,
    'Literal': literalSubstituter,
    'UnaryExpression': unaryExpSubstituter,
    'BinaryExpression': binaryExpSubstituter,
    'MemberExpression': memberExpSubstituter
};*/
/*
const expSubstituteDirectorJSON = {
    'Identifier': identifierSubstituterJSON,
    'Literal': literalSubstituterJSON,
    'UnaryExpression': unaryExpSubstituterJSON,
    'BinaryExpression': binaryExpSubstituterJSON,
    'MemberExpression': memberExpSubstituterJSON
};*/


function exportComponents(parsedCode){
    if(parsedCode.type == 'Program') {
        dot = esgraph.dot(esgraph(globalParsedCode.body[0].body), {counter: 0, source: codeString});
        for(let idx1 in parsedCode.body){
            parsedCode.body[idx1] = exportGlobals(parsedCode.body[idx1]);
        }
        for(let idx1 in parsedCode.body){
            parsedCode.body[idx1] = exportInsideFunc(parsedCode.body[idx1]);
        }
    }
    else{
        return parseFunctionDirector[parsedCode.type](parsedCode);
    }
    if(parsedCode.type == 'Program'){
        outputCode = escodgen.generate(parsedCode);  //JSON.stringify(parsedCode, null, 2);
        return parsedCode;
    }
}




function exportGlobals(parsedCode){
    /*if(parsedCode.type == 'VariableDeclaration' || parsedCode.type == 'ExpressionStatement') {
        return parseFunctionDirector[parsedCode.type + 'Glob'](parsedCode);
    }*/
    return parsedCode;
}
function exportInsideFunc(parsedCode){
    //if(parsedCode.type == 'FunctionDeclaration') {
    return parseFunctionDirector[parsedCode.type](parsedCode);
    /*}
    else {
        return parsedCode;
    }*/
}


// ****************************************************************************************************************
// ****************************************************************************************************************
function prepareEvaluate(readyToGraphJson){
    var env_temp = JSON.parse(JSON.stringify(environment));//$.extend(true, [], environment);
    readyToGraphJson = deleteRedundantCode(readyToGraphJson);
    environment = JSON.parse(JSON.stringify(env_temp));//$.extend(true, [], env_temp);
    env = {};
    var Parser = require('expr-eval').Parser;
    // for all params of function --> insert to env the value of param.
    for(let idx in environment){
        if(environment[idx].Type == 'Identifier'){
            env[environment[idx].Name] = eval(environment[idx].Value);//Parser.evaluate(environment[idx].Value, env);
        }
        else{
            env[environment[idx].Name] = Parser.evaluate(environment[idx].Value, env);
        }
    }
    return readyToGraphJson;
}


function evaluateComponents(parsedCode){
    lines = outputCode.split('\n');

    if(parsedCode.type == 'Program') {
        for (let idx1 in parsedCode.body) {
            evaluateFunctionDirector[parsedCode.body[idx1].type](parsedCode.body[idx1]);
        }
    }
    outputCode = '';
    for(var j=0; j<lines.length; j++){
        outputCode = outputCode + lines[j] + '\n';
    }
    return outputCode;
}


function functionEvaluator(funcJson){
    for (let idx1 in funcJson.body.body) {
        evaluateFunctionDirector[funcJson.body.body[idx1].type](funcJson.body.body[idx1]);
    }
}

function expressionEvaluator(expJson){
    evaluateFunctionDirector[expJson.expression.type](expJson.expression);
}


function assignmentEvaluator(assJson){
    /* Now color the while.graphIDX line with editProperty */
    editElementProperty(assJson.graph_index, 'color="Green"', '');
    editElementProperty(assJson.graph_index, 'style="filled"', '');
    // eval the right side
    var rightSide;
    if(assJson.right.type == 'MemberExpression'){
        rightSide = String(env[assJson.right.object.name][assJson.right.property.value]);
    }
    else{
        rightSide = escodgen.generate(assJson.right);
    }
    var leftSide = assJson.left.name;
    var Parser = require('expr-eval').Parser;
    // save into left side in the env
    env[leftSide] = Parser.evaluate(rightSide, env);
}

function whileEvaluator(whileJson){
    var Parser = require('expr-eval').Parser;
    /* Now color the while.graphIDX line with editProperty */
    editElementProperty(whileJson.graph_index, 'color="Green"', '');
    editElementProperty(whileJson.graph_index, 'style="filled"', '');
    editElementProperty(whileJson.graph_index, 'shape="diamond"', '');
    var test_str = codeString.substring(whileJson.test.range[0], whileJson.test.range[1]);
    var test_json = esprima.parseScript(test_str, {loc: true, range: true}).body[0].expression;
    test_json = checkAndReplaceMem(test_json);
    var text = escodgen.generate(test_json);
    while(Parser.evaluate(text, env)){
        for (let idx1 in whileJson.body.body) {
            evaluateFunctionDirector[whileJson.body.body[idx1].type](whileJson.body.body[idx1]);
        }
    }
    return whileJson;
}

function checkAndReplaceMem(cond_json){
    /*if(cond_json.type == 'MemberExpression'){
        var val = String(env[cond_json.object.name][cond_json.property.value]);
        return esprima.parseScript(val, {loc: true, range: true}).body[0].expression;
    }
    else */if(cond_json.type == 'BinaryExpression'){
        cond_json.left = checkAndReplaceMem(cond_json.left);
        cond_json.right = checkAndReplaceMem(cond_json.right);
        return cond_json;
    }
    else{
        return cond_json;
    }
}


function returnEvaluator(retJson){
    /* Now color the while.graphIDX line with editProperty */
    editElementProperty(retJson.graph_index, 'color="Green"', '');
    editElementProperty(retJson.graph_index, 'style="filled"', '');
    return retJson;
}


const evaluateFunctionDirector = {
    'FunctionDeclaration': functionEvaluator,
    'ExpressionStatement': expressionEvaluator,
    'AssignmentExpression': assignmentEvaluator,
    'WhileStatement': whileEvaluator,
    'IfStatement': ifEvaluator,
    'ReturnStatement': returnEvaluator
};

function varStructEnvBuild(parsedVarDecl, i){
    const varStruct = {
        'Line': parsedVarDecl.loc.start.line.toString(),
        'Type': parsedVarDecl.type,
        'Name': parsedVarDecl.declarations[i].id.name,
        'Condition': '',
        'Value': val_of_init_helper(parsedVarDecl, i)};
    const varStructEnv = {
        'Line': parsedVarDecl.loc.start.line.toString(),
        'Type': parsedVarDecl.type,
        'Name': parsedVarDecl.declarations[i].id.name,
        'Condition': '',
        'Value': codeString.substring(parsedVarDecl.declarations[i].init.range[0], parsedVarDecl.declarations[i].init.range[1]), //ensureSubtitution(parsedVarDecl.declarations[i].init),
        'json_Val': parsedVarDecl.declarations[i].init};
    return [varStruct, varStructEnv];
}


function variableExporter(parsedVarDecl){
    var substiutedJSON = parsedVarDecl;
    for(var i=0; i<parsedVarDecl.declarations.length; i++){
        if(parsedVarDecl.declarations[i].init == null){
            parsedVarDecl.declarations[i].init = esprima.parseScript('0', {loc: true, range: true}).body[0].expression;
        }
        var structs = varStructEnvBuild(parsedVarDecl, i);
        global.push(structs[0]);
        environment.push(structs[1]);
        substiutedJSON['graph_index'] = getGraphIdx(escodgen.generate(parsedVarDecl));
    }
    return substiutedJSON;
}

/*function varGlobStructEnvBuild(parsedVarDecl, i){
    const varStruct = {
        'Line': parsedVarDecl.loc.start.line.toString(),
        'Type': parsedVarDecl.type + 'Glob',
        'Name': parsedVarDecl.declarations[i].id.name,
        'Condition': '',
        'Value': val_of_init_helper(parsedVarDecl, i)};
    const varStructEnv = {
        'Line': parsedVarDecl.loc.start.line.toString(),
        'Type': parsedVarDecl.type + 'Glob',
        'Name': parsedVarDecl.declarations[i].id.name,
        'Condition': '',
        'Value': codeString.substring(parsedVarDecl.declarations[i].init.range[0], parsedVarDecl.declarations[i].init.range[1]),//ensureSubtitution(parsedVarDecl.declarations[i].init),
        'json_Val': parsedVarDecl.declarations[i].init};
    return [varStruct, varStructEnv];
}

function variableExporterGlob(parsedVarDecl){
    var substiutedJSON = parsedVarDecl;
    for(var i=0; i<parsedVarDecl.declarations.length; i++){
        if(parsedVarDecl.declarations[i].init == null){
            parsedVarDecl.declarations[i].init = esprima.parseScript('0', {loc: true, range: true}).body[0].expression;
        }
        var structs = varGlobStructEnvBuild(parsedVarDecl, i);
        global.push(structs[0]);
        environment.push(structs[1]);
        substiutedJSON['graph_index'] = getGraphIdx(escodgen.generate(parsedVarDecl));
    }
    return substiutedJSON;
}*/

function IdentifiersBuild(params, i){
    const varStruct = {
        'Line': params[i].loc.start.line.toString(),
        'Type': params[i].type,
        'Name': params[i].name,
        'Condition': '',
        'Value': ''
    };
    const varStructEnv = {
        'Line': params[i].loc.start.line.toString(),
        'Type': params[i].type,
        'Name': params[i].name,
        'Condition': '',
        'Value': params[i].name,
        'json_Val': params[i]
    };
    return [varStruct, varStructEnv];
}


function exportIdentifiers(params) {
    for(var i=0; i<params.length; i++) {
        var structs = IdentifiersBuild(params, i);
        params_glob.push(params[i].name);
        global.push(structs[0]);
        environment.push(structs[1]);
    }
}


function consequent_exporter_helper(consequent, idx){
    for(let idx_1 in environment) {
        if(consequent.body[idx].type == 'ExpressionStatement' && consequent.body[idx].expression.type == 'AssignmentExpression'){
            if(environment[idx_1].Name == consequent.body[idx].expression.left.name){
                environment[idx_1].Condition = 'volatile';
            }
        }
    }
}

function consequent_exporter(consequent) {
    /*if(consequent.type != 'BlockStatement'){
        return exportComponents(consequent);
    }*/
    //else{
    for(let idx1 in consequent.body){
        consequent.body[idx1] = exportComponents(consequent.body[idx1]);
    }
    for(let idx in consequent.body) {
        consequent_exporter_helper(consequent, idx);
    }
    //}
    return consequent;
}

function ifExporter_helper(parsedIfStat, ...elseType){
    var type = parsedIfStat.type;
    if(elseType.length>0 && elseType[0]=='ElseType') type='ElseIfStatment';
    const ifStruct = {
        'Line': parsedIfStat.loc.start.line.toString(),
        'Type': type,
        'Name': '',
        'Condition': parsedIfStat.test, //ensureSubtitution(parsedIfStat.test),
        'Value': ''};
    global.push(ifStruct);
    parsedIfStat['graph_index'] = getGraphIdx(escodgen.generate(parsedIfStat.test));
}

function ifExporter_helper2(volatiles){
    for(let idx in environment){
        if(environment[idx].Condition == 'volatile'){
            volatiles.push(environment[idx].Name);}}
    return volatiles;
}

function ifExporter(parsedIfStat, ...elseType) {
    ifExporter_helper(parsedIfStat, ...elseType);
    var env_temp = JSON.parse(JSON.stringify(environment));
    parsedIfStat.consequent = consequent_exporter(parsedIfStat.consequent);
    var volatiles = [];
    if(parsedIfStat.alternate != null){
        setenvironment(JSON.parse(JSON.stringify(env_temp)));//$.extend(true, [], env_temp));
        parsedIfStat.alternate = alternate_exporter(parsedIfStat.alternate);}
    volatiles = ifExporter_helper2(volatiles);
    setenvironment(JSON.parse(JSON.stringify(env_temp)));//$.extend(true, [], env_temp));
    for(let idx in volatiles){
        for(let idx_2 in environment){
            if(environment[idx_2].Name == volatiles[idx]){
                environment[idx_2].Condition = 'volatile';}}}
    return parsedIfStat;
}

/*function identifierSubstituter(parsedExp) {
    for(let idx in environment){
        if(environment[idx].Name == parsedExp.name && environment[idx].Value != 'null' && environment[idx].Value != null  && environment[idx].Condition != 'volatile'){
            if(environment[idx].json_Val.type == 'BinaryExpression' && (environment[idx].json_Val.operator == '+' || environment[idx].json_Val.operator == '-')){
                return '(' + environment[idx].Value + ')';
            }
            return environment[idx].Value;
        }
    }
    return parsedExp.name;
}
function binaryExpSubstituter(parsedExp) {
    var leftAfterSub = expSubstituteDirector[parsedExp.left.type](parsedExp.left);
    var rightAfterSub = expSubstituteDirector[parsedExp.right.type](parsedExp.right);
    if(parsedExp.operator == '*' || parsedExp.operator == '/'){
        if(parsedExp.left.type == 'BinaryExpression' && (parsedExp.left.operator == '+' || parsedExp.left.operator == '-')){
            leftAfterSub = '(' + leftAfterSub + ')';
        }
        if(parsedExp.right.type == 'BinaryExpression' && (parsedExp.right.operator == '+' || parsedExp.right.operator == '-')) {
            rightAfterSub = '(' + rightAfterSub + ')';
        }
    }
    return leftAfterSub + parsedExp.operator + rightAfterSub;
}*/

/*function identifierSubstituterJSON(parsedExp) {
    for(let idx in environment){
        if(environment[idx].Name == parsedExp.name && environment[idx].Value != 'null' && environment[idx].Value != null && environment[idx].Condition != 'volatile'){
            return environment[idx].json_Val;
        }
    }
    return parsedExp;
}*/

function deleteRedundantCode_helper1(parsedCodeJSON, idx){
    /*if(parsedCodeJSON.body[idx].type == 'VariableDeclaration'){
        /!* Now color the while.graphIDX line with editProperty *!/
        editElementProperty(parsedCodeJSON.body[idx].graph_index, 'color="Green"', '');
        editElementProperty(parsedCodeJSON.body[idx].graph_index, 'style="filled"', '');
        parsedCodeJSON.body.splice(idx, 1);
        idx--;
    }
    else*/ if(parsedCodeJSON.body[idx].type == 'FunctionDeclaration'){
        parsedCodeJSON.body[idx] = deleteRedundantCode(parsedCodeJSON.body[idx]);
    }
    return [parsedCodeJSON, idx];
}


function deleteRedundantCode_helper2(parsedCodeJSON){
    for(let idx=0; idx < parsedCodeJSON.body.body.length; idx++){
        if(parsedCodeJSON.body.body[idx].type == 'VariableDeclaration'){
            /* Now color the while.graphIDX line with editProperty */
            editElementProperty(parsedCodeJSON.body.body[idx].graph_index, 'color="Green"', '');
            editElementProperty(parsedCodeJSON.body.body[idx].graph_index, 'style="filled"', '');
            parsedCodeJSON.body.body.splice(idx, 1);
            idx--;
        }
    }
    return parsedCodeJSON;
}

function deleteRedundantCode(parsedCodeJSON){
    if(parsedCodeJSON.type == 'Program'){
        for(let idx=0; idx < parsedCodeJSON.body.length; idx++) {
            var return_vals = deleteRedundantCode_helper1(parsedCodeJSON, idx);
            parsedCodeJSON = return_vals[0];
            idx = return_vals[1];
        }
        setoutputCode(escodgen.generate(parsedCodeJSON));
    }
    else if(parsedCodeJSON.type == 'FunctionDeclaration'){
        parsedCodeJSON = deleteRedundantCode_helper2(parsedCodeJSON);
    }
    return parsedCodeJSON;
}


function ifEvaluator(ifJson){
    editElementProperty(ifJson.graph_index, 'color="Green"', '');
    editElementProperty(ifJson.graph_index, 'style="filled"', '');
    editElementProperty(ifJson.graph_index, 'shape="diamond"', '');
    //var Parser = require('expr-eval').Parser;
    //var test_str = codeString.substring(ifJson.test.range[0], ifJson.test.range[1]);
    //var test_json = esprima.parseScript(test_str, {loc: true, range: true}).body[0].expression;
    //test_json = checkAndReplaceMem(test_json);
    //var test_val = Parser.evaluate(escodgen.generate(test_json), env);
    //if (test_val) {
    for (let idx1 in ifJson.consequent.body) {
        evaluateFunctionDirector[ifJson.consequent.body[idx1].type](ifJson.consequent.body[idx1]);}//}
    /*else{
        if(ifJson.alternate.type == 'BlockStatement'){
            for (let idx1 in ifJson.alternate.body) {
                evaluateFunctionDirector[ifJson.alternate.body[idx1].type](ifJson.alternate.body[idx1]);}}
        else{
            evaluateFunctionDirector[ifJson.alternate.type](ifJson.alternate);}}*/
}


function parseInputs_helper(currName, currIn){
    for(let idx in environment){
        if(environment[idx].Name == currName && environment[idx].Type == 'Identifier'){
            environment[idx].Value = currIn;
        }
    }
}

function parseInputs(inputStr) {
    var partsOfInputStr = inputStr.split(',');
    //var accIn = '';
    for (var i=0; i<partsOfInputStr.length; i++){
        var currIn = partsOfInputStr[i];
        /*if(currIn.startsWith('[')){
            accIn = accIn + currIn;
            while(!accIn.endsWith(']')){
                accIn = accIn + ',' + partsOfInputStr[i+1];
                partsOfInputStr.splice(i,1);
            }
            currIn = partsOfInputStr[i] = accIn;
        }*/
        var currName = params_glob[i];
        parseInputs_helper(currName, currIn);
    }
}




// ****************************************************************************************************************
// ****************************************************************************************************************


export {parseCode};
export {exportComponents};
export {environment};
export {parseInputs};
export {prepareEvaluate};
export {evaluateComponents};
export {setenvironment};
export {dot};