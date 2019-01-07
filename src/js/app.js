import $ from 'jquery';
import {environment, parseCode, dot} from './code-analyzer';
import {exportComponents} from './code-analyzer';
import {parseInputs} from './code-analyzer';
import {prepareEvaluate} from './code-analyzer';
import {evaluateComponents} from './code-analyzer';
import {setenvironment}from './code-analyzer';
import Viz from 'viz.js';
const { Module, render } = require('viz.js/full.render.js');

//const esgraph = require('esgraph');
var dot_app;

$(document).ready(function () {
    $('#codeSubmissionButton').click(() => {
        let codeToParse = $('#codePlaceholder').val();
        let parsedCode = parseCode(codeToParse);
        $('#parsedCode').val(JSON.stringify(parsedCode, null, 2));
        var env_temp = JSON.parse(JSON.stringify(environment)); //save env
        setenvironment(env_temp);//restore environment
        let readyToGraphJson = exportComponents(parsedCode);
        parseInputs($('#inputPlaceholder').val());
        evaluateComponents(prepareEvaluate(readyToGraphJson));
        dot_app = dot;
        editDot(parsedCode);
        let svg = new Viz({Module, render});
        let sample = 'digraph{' + dot_app + '}';
        let cfg_element = document.getElementById('cfg');
        svg.renderSVGElement(sample).then(function(element){
            cfg_element.innerHTML = '';
            cfg_element.append(element);
        });});});


function editDot(){
    var lines = dot_app.split('\n');
    var curr_max = -1;
    for(var idx in lines){
        var element_name = lines[idx].split(/ (.+)/)[0];
        if(parseInt(element_name.substring(1)) > curr_max){
            curr_max = parseInt(element_name.substring(1));
            editElementProperty(idx, 'shape="box"', '');
        }
    }
    editElementProperty(0, 'color="Green"', '');
    editElementProperty(0, '', 'style="filled"');
    editElementProperty(curr_max, 'color="Green"', '');
    editElementProperty(curr_max, '', 'style="filled"');
    deleteExceptionArrows();
    numberingNodes();
}

function deleteExceptionArrows(){
    var lines = dot_app.split('\n');
    for(let line_idx in lines){
        var element_properties = lines[line_idx].split(/ (.+)/)[1];
        var properties = element_properties.substring(1,element_properties.length-1).split(', ');
        for(let idx in properties) {
            if(properties[idx].split(/=(.+)/)[0] == 'label') {
                if(properties[idx].split(/=(.+)/)[1] == '"exception"'){
                    lines.splice(line_idx,1);
                }
            }
        }
    }
    dot_app = lines.join('\n');
}

function handlePropertyToEdit(lines, element_properties, properties, propertyToEdit){
    for(let idx in properties) {
        if(properties[idx].split(/=(.+)/)[0] == propertyToEdit.split(/=(.+)/)[0]) {
            properties[idx] = propertyToEdit;
        }
    }
    element_properties = '[' + properties.join(', ') + ']';
    return element_properties;
}

function editElementProperty(elementNum, propertyToAdd, propertyToEdit){
    var lines = dot_app.split('\n');
    var element_properties = lines[elementNum].split(/ (.+)/)[1];
    var properties = element_properties.substring(1,element_properties.length-1).split(', ');
    if(propertyToAdd.length > 0) {
        for(let idx in properties) {
            if (properties[idx].split(/=(.+)/)[0] == propertyToAdd.split(/=(.+)/)[0]) {
                return;
            }
        }
        element_properties = element_properties.substring(0,element_properties.length-1) + ', ' + propertyToAdd + ']';
    }
    else {
        element_properties = handlePropertyToEdit(lines, element_properties, properties, propertyToEdit);
    }
    lines[elementNum] = lines[elementNum].split(/ (.+)/)[0] + ' ' + element_properties;
    dot_app = lines.join('\n');
}

/*function getGraphIdx(stringOfJson){
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
}*/


function numberingNodes(){
    var lines = dot_app.split('\n');
    var curr_max = -1;
    for(let line_idx in lines){
        var element_name = lines[line_idx].split(/ (.+)/)[0];
        if(parseInt(element_name.substring(1)) > curr_max) {
            curr_max = parseInt(element_name.substring(1));
            var element_properties = lines[line_idx].split(/ (.+)/)[1];
            var properties = element_properties.substring(1,element_properties.length-1).split(', ');
            properties[0] = 'label=' + '"<< ' + line_idx.toString() + ' >>\n' + properties[0].split(/=(.+)/)[1].substring(1);
            element_properties = '[' + properties.join(', ') + ']';
            lines[line_idx] = lines[line_idx].split(/ (.+)/)[0] + ' ' + element_properties;
            dot_app = lines.join('\n');
        }
        else return;
    }
}

export {editElementProperty};
export {handlePropertyToEdit};