import { buildProgramFromSources, loadShadersFromURLS, setupWebGL } from "../../libs/utils.js";
import {lookAt, flatten, inverse, mult, rotateX, rotateY, perspective, transpose, radians} from "../../libs/MV.js";
import {modelView, loadMatrix, multRotationX, multRotationY, multRotationZ, multScale, pushMatrix, popMatrix, multTranslation } from "../../libs/stack.js";
import { GUI } from "../../libs/dat.gui.module.js";
import * as CYLINDER from '../../libs/objects/cylinder.js';
import * as CUBE from '../../libs/objects/cube.js';
import * as TORUS from '../../libs/objects/torus.js';
import * as BUNNY from '../../libs/objects/bunny.js';

/** @type WebGLRenderingContext */
let gl;

let mode;

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
let materialsController;

let lights = [];

let dragging = false;
let mouseDrag = {x: 0, y: 0};


function setup(shaders)
{
    let canvas = document.getElementById("gl-canvas");
    let aspect = canvas.width / canvas.height;

    gl = setupWebGL(canvas);

    setupGUI();

    let program = buildProgramFromSources(gl, shaders["shader.vert"], shaders["shader.frag"]);

    mode = gl.TRIANGLES; 

    resize_canvas();
    window.addEventListener("resize", resize_canvas);

    addLight(PontualLight());
    addLight(DirectionalLight());
    addLight(SpotLight());

    document.onkeydown = function(event) 
    {
        switch(event.key) {
            case 'g':
                addLight(PontualLight());
                break;
            case 'h':
                addLight(DirectionalLight());
                break;
            case 'j':
                addLight(SpotLight());
                break;
            default:
                break;
        }
    }

    gl.clearColor(0, 0, 0, 1.0);
    CYLINDER.init(gl);
    CUBE.init(gl);
    TORUS.init(gl);
    BUNNY.init(gl);
    
    window.requestAnimationFrame(render);

    function resize_canvas(event)
    {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        aspect = canvas.width / canvas.height;

        gl.viewport(0,0,canvas.width, canvas.height);
    }

    canvas.addEventListener("mousedown", function(event) {
        dragging = true;
    });

    canvas.addEventListener("mousemove", function(event) {
        if(dragging){
            mouseDrag.x += event.movementX;
            mouseDrag.y += event.movementY;
        }
    });

    canvas.addEventListener("mouseup", function(event) {
        dragging = false;
    })

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

    function uploadMatrixes()
    {
        uploadModelView();
        upload_mNormals();
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
        setupMaterialsFolder();
    }

    // Setup the folders in the GUI ________________________________________________________________________________________________________________

    function setupOptionsFolder()
    {
        optionController = {culling: true, zb: true};

        optionsFolder.add(optionController, "culling").name("Backface culling");
        optionsFolder.add(optionController, "zb").name("Depth test");
    }

    function setupProjectionFolder()
    {
        projectionController = {fovy: 45, near: 0.1, far: 100};
        projectionFolder.add(projectionController, "fovy", 1, 180, 1);
        projectionFolder.add(projectionController, "near", 0.1, 50, 0.1);
        projectionFolder.add(projectionController, "far", 0.1, 100, 0.1);
    }

    function setupCameraFolder()
    {
        let eyeXYZ = {x: 0, y: VP_DISTANCE / 2, z: VP_DISTANCE};
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

    function createLightFolder(light){
        const lightName = "Light " + lights.length;
        let lightFolder = lightsFolder.addFolder(lightName);
        lightFolder.add(light, "on");
        let positionFolder = lightFolder.addFolder("position");
        let intensitiesFolder = lightFolder.addFolder("intensities");
        let axisFolder = lightFolder.addFolder("axis");

        setupXYZ(positionFolder, light.position);
        positionFolder.add(light.position, "w");

        intensitiesFolder.addColor(light.intensities, "ambient");
        intensitiesFolder.addColor(light.intensities, "diffuse");
        intensitiesFolder.addColor(light.intensities, "specular");

        setupXYZ(axisFolder, light.axis);

        lightFolder.add(light, "aperture", 0, 180, 0.5);
        lightFolder.add(light, "cutoff", 0, 8, 0.1);
    }

    function setupMaterialsFolder()
    {
        materialsController = {Ka: [190,190,190], Kd: [220,185,185], Ks: [200,200,200], shininess: 10};

        materialsFolder.addColor(materialsController, "Ka");
        materialsFolder.addColor(materialsController, "Kd");
        materialsFolder.addColor(materialsController, "Ks");
        materialsFolder.add(materialsController, "shininess");
    }


    // Light related operations ______________________________________________________________________________________________________________________

    //Adds a light to the scene
    function addLight(light){
        if (lights.length < MAX_LIGHTS){
            lights.push(light);
            createLightFolder(light);

            gl.useProgram(program);
            const uNLights = gl.getUniformLocation(program, "uNLights");
            gl.uniform1i(uNLights, lights.length);
        }
    }

    function SpotLight()
    {
        let position = {x: 0, y: 2, z: 0, w: 1};
        let axis = {x: 5, y: -177, z: -607};
        let aperture = 17;
        let cutoff = 2;

        return new Light(position, axis, aperture, cutoff);
    }

    function DirectionalLight()
    {
        let position = {x: -5, y: 7, z: 3, w: 0};
        let axis = {x: 0, y: -2, z: 0};
        let aperture = 180;
        let cutoff = 0;

        return new Light(position, axis, aperture, cutoff);
    }

    function PontualLight()
    {
        let position = {x: 0, y: 2, z: 0, w: 1};
        let axis = {x: 0, y: -2, z: 0};
        let aperture = 180;
        let cutoff = 0;
        
        return new Light(position, axis, aperture, cutoff);
    }

    //Constructor function for a light
    function Light(position, axis, aperture, cutoff){
        this.position = position;
        this.intensities = {ambient: [40,40,40], diffuse: [40,40,40], specular: [200,200,200]};
        this.axis = axis;
        this.aperture = aperture;
        this.cutoff = cutoff;
        this.on = true;
    }

    //Sends the lights to the shaders
    function sendLights()
    {
        for (let i = 0; i < lights.length; i++){
            const uAmbient = gl.getUniformLocation(program, "uLights[" + i + "].ambient");
            const uDiffuse = gl.getUniformLocation(program, "uLights[" + i + "].diffuse");
            const uSpecular = gl.getUniformLocation(program, "uLights[" + i + "].specular");
            const uPosition = gl.getUniformLocation(program, "uLights[" + i + "].position");
            const uAxis = gl.getUniformLocation(program, "uLights[" + i + "].axis");
            const uAperture = gl.getUniformLocation(program, "uLights[" + i + "].aperture");
            const uCutoff = gl.getUniformLocation(program, "uLights[" + i + "].cutoff");
            const uOn = gl.getUniformLocation(program, "uLights[" + i + "].on");

            let light = lights[i];

            gl.uniform3fv(uAmbient, light.intensities.ambient);
            gl.uniform3fv(uDiffuse, light.intensities.diffuse);
            gl.uniform3fv(uSpecular, light.intensities.specular);
            gl.uniform4fv(uPosition, makeAttributeArray(light.position));
            gl.uniform3fv(uAxis, makeAttributeArray(light.axis));
            gl.uniform1f(uAperture, radians(light.aperture));
            gl.uniform1f(uCutoff, light.cutoff);
            gl.uniform1i(uOn, light.on);
        }
    }

    //Enables or disables backface culling or the depth test
    function setHiddenFaceRemoval()
    {
        if (optionController.culling)   
            gl.enable(gl.CULL_FACE);
        else 
            gl.disable(CULL_FACE);

        if (optionController.zb)   
            gl.enable(gl.DEPTH_TEST);
        else 
            gl.disable(gl.DEPTH_TEST);
    }

    // A textbox for each X, Y, Z attribute
    function setupXYZ(folder, controller)
    {
        folder.add(controller, "x");
        folder.add(controller, "y");
        folder.add(controller, "z");
    }

    // BASIC OBJECTS ________________________________________________________

    // Define the object's illumination properties
    function defineMaterialProperties(materialAmb, materialDif, materialSpe, shininess)
    {
        const uMaterialAmb = gl.getUniformLocation(program, "uMaterial.Ka");
        const uMaterialDif = gl.getUniformLocation(program, "uMaterial.Kd");
        const uMaterialSpe = gl.getUniformLocation(program, "uMaterial.Ks");
        const uShininess = gl.getUniformLocation(program, "uMaterial.shininess");

        gl.uniform3fv(uMaterialAmb, materialAmb);
        gl.uniform3fv(uMaterialDif, materialDif);
        gl.uniform3fv(uMaterialSpe, materialSpe);
        gl.uniform1f(uShininess, shininess);
    }

    function Ground()
    {
        uploadMatrixes();  
        defineMaterialProperties([255,128,128],[255,128,128],[255,255,255], 5);
        CUBE.draw(gl, program, mode);
    }

    function Cube()
    {
        uploadMatrixes();
        defineMaterialProperties([180,50,50],[180,50,50],[255,255,255], 5);
        CUBE.draw(gl, program, mode);
    }

    function Cylinder()
    {
        uploadMatrixes();
        defineMaterialProperties([80,160,80],[80,160,80],[255,255,255], 5);
        CYLINDER.draw(gl, program, mode);
    }

    function Torus()
    {
        uploadMatrixes();
        defineMaterialProperties([100,215,100],[100,215,100],[255,255,255], 5);
        TORUS.draw(gl, program, mode);
    }

    function Bunny()
    {
        uploadMatrixes();
        defineMaterialProperties(materialsController.Ka, materialsController.Kd, materialsController.Ks, materialsController.shininess);
        BUNNY.draw(gl, program, mode);
    }

    // FULL SCENE ______________________________________________________________

    function FullScene()
    { 
        pushMatrix();
            multTranslation([0, -0.25, 0]);
            multScale([10, 0.5, 10]);
            Ground();
        popMatrix();
        pushMatrix();
            multTranslation([2.5, 0, 2.5]);
            multScale([10,10,10]);
            Bunny();
        popMatrix();
        pushMatrix();
            multTranslation([2.5,0.5,-2.5]);
            Cylinder();
        popMatrix();
        pushMatrix();
            multTranslation([-2.5,0.5,-2.5]);
            Cube();
        popMatrix();
            multTranslation([-2.5,0.235,2.5]);
            multScale([1.3,1.2,1.3]);
            Torus();
    }

    //Other functions___________________________________________________________________________________
    
    function render()
    {
        window.requestAnimationFrame(render);
        
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        gl.useProgram(program);

        const mProjection = perspective(projectionController.fovy, aspect, projectionController.near, projectionController.far); 
        
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mProjection"), false, flatten(mProjection));

        enactView();

        setHiddenFaceRemoval();

        sendLights();

        FullScene();
    }

    // AUXILIARY FUNCTIONS __________________________________________________________
    function enactView()
    {
        let eye = makeAttributeArray(cameraController.eye);
        let at = makeAttributeArray(cameraController.at);
        let up = makeAttributeArray(cameraController.up);
        let mView = mult(lookAt(eye, at, up), mult(rotateX(mouseDrag.y), rotateY(mouseDrag.x)));      
        loadMatrix(mView);
    }

    function makeAttributeArray(obj)
    {
        const array = [];
        for (const a in obj)
            array.push(obj[a]);
        return array;
    }

}
const urls = ["shader.vert", "shader.frag"];
loadShadersFromURLS(urls).then(shaders => setup(shaders))
