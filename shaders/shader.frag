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

vec3 toRGB(vec3 array){
    return array.xyz / 255.0;
}

void main() {

    // Compute the view vector
    vec3 fViewer = - fPosition; // Perspective projection

    vec3 V = normalize(fViewer);
    vec3 N = normalize(fNormal);

    vec3 I;

    for(int i = 0; i < MAX_LIGHTS; i++) {
        if(i == uNLights) break;  

        LightInfo light = uLights[i];

        if(light.on){
            vec3 ambientColor = toRGB(light.ambient) * toRGB(uMaterial.Ka);     //Ia * Ka
            vec3 diffuseColor = toRGB(light.diffuse) * toRGB(uMaterial.Kd);     //Id * Kd
            vec3 specularColor = toRGB(light.specular) * toRGB(uMaterial.Ks);    //Is * Ks

            float attenuationFactor;
            vec3 L;
            // compute light vector in camera frame
            if(light.position.w == 0.0){
                L = normalize(light.position.xyz);
                attenuationFactor = 1.0;
            }else{
                L = normalize(light.position.xyz - fPosition);

                float cos_alpha = dot(L, normalize(vec4(-light.axis,0.0).xyz));

                if (cos_alpha > cos(light.aperture)) 
                    attenuationFactor = pow(cos_alpha, light.cutoff);
            }
            vec3 R = reflect(-L, N);

            float diffuseFactor = max( dot(L,N), 0.0 );
            vec3 diffuse = diffuseFactor * diffuseColor;
            float specularFactor = pow(max(dot(R,V), 0.0), uMaterial.shininess);
            vec3 specular = specularFactor  * specularColor;
            if( dot(L,N) < 0.0 )
                specular = vec3(0.0, 0.0, 0.0);
         
	        I += ambientColor + attenuationFactor * (diffuse + specular);
        }
    }
    
    gl_FragColor = vec4(I, 1.0);
}
