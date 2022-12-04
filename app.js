import { buildProgramFromSources, loadShadersFromURLS, setupWebGL } from "../../libs/utils.js";
import { ortho, lookAt, flatten, inverse, mult, rotateX, rotateY, perspective, transpose} from "../../libs/MV.js";
import {modelView, loadMatrix, multRotationX, multRotationY, multRotationZ, multScale, pushMatrix, popMatrix, multTranslation } from "../../libs/stack.js";
import { GUI } from "../../libs/dat.gui.module.js";
import * as CYLINDER from '../../libs/objects/cylinder.js';
import * as CUBE from '../../libs/objects/cube.js';
import * as TORUS from '../../libs/objects/torus.js';
import * as BUNNY from '../../libs/objects/bunny.js';

/** @type WebGLRenderingContext */
let gl;

let mode;               // Drawing mode (gl.LINES or gl.TRIANGLES)

let projectionState = 1;
let mProjection;
let mView;

const VP_DISTANCE = 10;
const MAX_LIGHTS = 8;

let gui = new GUI();

let optionsFolder;
let projectionFolder;
let cameraFolder;
let lightsFolder;
let materialsFolder;

let optionController;
let projectionController;
let cameraController;
let lightsController;
let materialsController;

let lights = [];


function setup(shaders)
{
    let canvas = document.getElementById("gl-canvas");
    let aspect = canvas.width / canvas.height;

    gl = setupWebGL(canvas);

    setupGUI();

    let program = buildProgramFromSources(gl, shaders["shader.vert"], shaders["shader.frag"]);

    mProjection = perspective(45, aspect, VP_DISTANCE, 3 * VP_DISTANCE);

    mode = gl.TRIANGLES; 

    resize_canvas();
    window.addEventListener("resize", resize_canvas);

    document.onkeydown = function(event) 
    {
        switch(event.key) {
            case '1':
                projectionState = 1;
                break;
            case '2':
                projectionState = 2;
                break;
            case '3':
                projectionState = 3;
                break;
            case '4':
                projectionState = 4;
                break;
            case 'l':
                addLight();
                break;
        }
    }

    gl.clearColor(0, 0, 0, 1.0);
    CYLINDER.init(gl);
    CUBE.init(gl);

    TORUS.init(gl);
    BUNNY.init(gl);
    gl.enable(gl.DEPTH_TEST);   // Enables Z-buffer depth test
    
    window.requestAnimationFrame(render);

    function resize_canvas(event)
    {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        aspect = canvas.width / canvas.height;

        gl.viewport(0,0,canvas.width, canvas.height);
        mProjection = perspective(45, aspect, VP_DISTANCE, 3 * VP_DISTANCE);
    }

    function uploadModelView()
    {
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mModelView"), false, flatten(modelView()));
    }

    function upload_mNormals()
    {
        const location = gl.getUniformLocation(program, "mNormals");
        let uMNormals = inverse(transpose(modelView()));
        gl.uniformMatrix4fv(location, false, flatten(uMNormals));
    }

    function upload_mViewNormals()
    {
        const location = gl.getUniformLocation(program, "mViewNormals");
        let uMViewNormals = inverse(transpose(mView));
        gl.uniformMatrix4fv(location, false, flatten(uMViewNormals));
    }

    function upload_mView()
    {
        const location = gl.getUniformLocation(program, "mView");
        gl.uniformMatrix4fv(location, false, flatten(mView));
    }

    function uploadMatrixes()
    {
        uploadModelView();
        upload_mNormals();
        upload_mViewNormals();
        upload_mView();
    }

    function setupGUI()
    {
        optionsFolder = gui.addFolder("Options");
        projectionFolder = gui.addFolder("Perspective");
        cameraFolder = gui.addFolder("Camera");
        lightsFolder = gui.addFolder("Lights");
        materialsFolder = gui.addFolder("Materials");

        setupOptionsFolder();
        setupProjectionFolder();
        setupCameraFolder();
        setupLightsFolder();
        setupMaterialsFolder();
    }

    function setupOptionsFolder()
    {
        optionController = {culling: true, zb: true};

        optionsFolder.add(optionController, "culling").name("Backface culling");
        optionsFolder.add(optionController, "zb").name("Depth test");
    }

    function setupProjectionFolder()
    {
        projectionController = {fovy: 45, near: 0.1, far: 40};
        projectionFolder.add(projectionController, "fovy", 1, 90, 1);
        projectionFolder.add(projectionController, "near", 0.1, 40, 0.1);
        projectionFolder.add(projectionController, "far", 0.1, 40, 0.1);
    }

    function setupCameraFolder()
    {
        let eyeXYZ = {x: 0, y: 0, z: -10};
        let atXYZ = {x: 0, y: 0, z: 0};
        let upXYZ = {x: 0, y: 1, z: 0};
        cameraController = {eye: eyeXYZ, at: atXYZ, up: upXYZ}; 

        let eyeFolder = cameraFolder.addFolder("eye");
        let atFolder = cameraFolder.addFolder("at");
        let upFolder = cameraFolder.addFolder("up");

        setupXYZ(eyeFolder, eyeXYZ);
        setupXYZ(atFolder, atXYZ);
        setupXYZ(upFolder, upXYZ);
    }

    function setupLightsFolder()
    {

    }

    function addLight(){
        let light = new Light();
        lights.push(light);
        createLightFolder(light);
    }

    function Light(){
        this.position = {x: 0, y: 0, z: 0, w: 1};
        this.intensities = {ambient: [50,50,50], diffuse: [60,60,60], specular: [200,200,200]};
        this.axis = {x: 0, y: 0, z: -1};
        this.aperture = 10;
        this.cutoff = 10;
    }

    function createLightFolder(light){
        const lightName = "Light " + lights.length;
        let lightFolder = lightsFolder.addFolder(lightName);
        let positionFolder = lightFolder.addFolder("position");
        let intensitiesFolder = lightFolder.addFolder("intensities");
        let axisFolder = lightFolder.addFolder("axis");

        setupXYZ(positionFolder, light.position);
        positionFolder.add(light.position, "w");

        intensitiesFolder.addColor(light.intensities, "ambient");
        intensitiesFolder.addColor(light.intensities, "diffuse");
        intensitiesFolder.addColor(light.intensities, "specular");

        setupXYZ(axisFolder, light.axis);

        lightFolder.add(light, "aperture", 0, 360, 1);
        lightFolder.add(light, "cutoff", 0, 100, 1);
    }

    function setupMaterialsFolder()
    {
        let KaRGB = [150,150,150];
        let KdRGB = [150,150,150];
        let KsRGB = [200,200,200];
        let shininessValue = 100;
        materialsController = {Ka: KaRGB, Kd: KdRGB, Ks: KsRGB, shininess: shininessValue};

        materialsFolder.addColor(materialsController, "Ka");
        materialsFolder.addColor(materialsController, "Kd");
        materialsFolder.addColor(materialsController, "Ks");
        materialsFolder.add(materialsController, "shininess");
    }

    function setupXYZ(folder, controller)
    {
        folder.add(controller, "x");
        folder.add(controller, "y");
        folder.add(controller, "z");
    }

    // BASIC OBJECTS ________________________________________________________

    function Cube(color)
    {
        uploadMatrixes();
        
        const uColor = gl.getUniformLocation(program, "uColor");
        gl.uniform3fv(uColor, color);

        CUBE.draw(gl, program, mode);
    }

    function Cylinder(color)
    {
        uploadMatrixes();
        
        const uColor = gl.getUniformLocation(program, "uColor");
        gl.uniform3fv(uColor, color);

        CYLINDER.draw(gl, program, mode);
    }

    function Torus(color)
    {
        uploadMatrixes();
        
        const uColor = gl.getUniformLocation(program, "uColor");
        gl.uniform3fv(uColor, color);

        TORUS.draw(gl, program, mode);
    }

    function Bunny(color)
    {
        uploadMatrixes();
        
        const uColor = gl.getUniformLocation(program, "uColor");
        gl.uniform3fv(uColor, color);

        BUNNY.draw(gl, program, mode);
    }

    // FULL SCENE ______________________________________________________________

    function FullScene()
    { 
        pushMatrix();
            multTranslation([0, -0.25, 0]);
            multScale([10, 0.5, 10]);
            Cube([0.9,0.5,0.4]);
        popMatrix();
        pushMatrix();
            multTranslation([2.5, 0, 2.5]);
            multScale([10,10,10]);
            Bunny([0.9, 0.7, 0.7]);
        popMatrix();
        pushMatrix();
            multTranslation([2.5,0.5,-2.5]);
            Cylinder([0.3, 0.6, 0.3]);
        popMatrix();
        pushMatrix();
            multTranslation([-2.5,0.5,-2.5]);
            Cube([0.7,0.2,0.2]);
        popMatrix();
            multTranslation([-2.5,0.235,2.5]);
            multScale([1.3,1.2,1.3]);
            Torus([0.4,0.85,0.4]);
    }

    //___________________________________________________________________________________
    
    function render()
    {
        window.requestAnimationFrame(render);
        
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        gl.useProgram(program);
        
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mProjection"), false, flatten(mProjection));

        enactProjection();

        FullScene();
    }

    // AUXILIARY FUNCTIONS __________________________________________________________
    function enactProjection()
    {
        switch(projectionState){
            case 1:
                mView = lookAt([-VP_DISTANCE, VP_DISTANCE, VP_DISTANCE], [0, 0, 0], [0, 1, 0]);          
                break;
            case 2:
                mView = frontView();
                break;
            case 3:
                mView = mult(frontView(), rotateX(90));
                break;
            case 4:
                mView = mult(frontView(), rotateY(-90));
                break;
        }
        loadMatrix(mView);
    }

    function frontView()
    {
        return lookAt([0,0,VP_DISTANCE],[0,0,0],[0,1,0]);
    }
}
const urls = ["shader.vert", "shader.frag"];
loadShadersFromURLS(urls).then(shaders => setup(shaders))