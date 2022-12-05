precision mediump float;

const int MAX_LIGHTS = 8;

varying vec3 fPosition;
varying vec3 fNormal;

struct LightInfo {
    // Light colour intensities
    vec3 ambient;
    vec3 diffuse;
    vec3 specular;

    // Light geometry
    vec4 position;  // Position/direction of light (in camera coordinates)
    // ...
    //   additional fields
    vec3 axis;
    float aperture;
    float cutoff;
    // ...
    bool on;
};

struct MaterialInfo {
    vec3 Ka;
    vec3 Kd;
    vec3 Ks;
    float shininess;
};

uniform int uNLights; // Effective number of lights used

uniform LightInfo uLights[MAX_LIGHTS]; // The array of lights present in the scene
uniform MaterialInfo uMaterial;        // The material of the object being drawn

uniform mat4 mView; // view transformation (for points)
uniform mat4 mViewNormals; // view transformation (for vectors)

vec3 toRGB(vec3 array){
    return array.xyz / 255.0;
}

void main() {
    vec3 L;
    vec3 ambientColor;
    vec3 diffuseColor;
    vec3 specularColor;
    for(int i = 0; i < MAX_LIGHTS; i++) {
        if(i == uNLights) break;  

        LightInfo light = uLights[i];

        if(light.on){
            ambientColor += toRGB(light.ambient) * uMaterial.Ka;     //Ia * Ka
            diffuseColor += toRGB(light.diffuse) * uMaterial.Kd;     //Id * Kd
            specularColor += toRGB(light.specular) * uMaterial.Ks;    //Is * Ks

            // compute light vector in camera frame
            if(light.position.w == 0.0)
                L += normalize((mViewNormals * light.position).xyz);
            else
                L += normalize((mView * light.position).xyz - fPosition);
        }
    }
    
    // Compute the view vector
    vec3 fViewer = - fPosition; // Perspective projection

    vec3 V = normalize(fViewer);
    vec3 N = normalize(fNormal);
    vec3 R = reflect(-L, N); 

    float diffuseFactor = max( dot(L,N), 0.0 );
    vec3 diffuse = diffuseFactor * diffuseColor;
    float specularFactor = pow(max(dot(R,V), 0.0), uMaterial.shininess);
    vec3 specular = specularFactor * specularColor;
    if( dot(L,N) < 0.0 ) {
        specular = vec3(0.0, 0.0, 0.0);
    }
    gl_FragColor = vec4(ambientColor + diffuse + specular, 1.0);
}