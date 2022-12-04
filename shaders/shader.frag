precision mediump float;

varying vec3 fPosition;
varying vec3 fNormal;

const vec3 materialAmb = vec3(1.0, 0.0, 0.0);   //Ka
const vec3 materialDif = vec3(1.0, 0.0, 0.0);   //Kd
const vec3 materialSpe = vec3(1.0, 1.0, 1.0);   //Ks
const float shininess = 6.0;    //shininess

const vec3 lightAmb = vec3(0.2, 0.2, 0.2);  //Ia
const vec3 lightDif = vec3(0.7, 0.7, 0.7);  //Id
const vec3 lightSpe = vec3(1.0, 1.0, 1.0);  //Is

vec3 ambientColor = lightAmb * materialAmb;     //Ia * Ka
vec3 diffuseColor = lightDif * materialDif;     //Id * Kd
vec3 specularColor = lightSpe * materialSpe;    //Is * Ks

varying vec3 fLight;
varying vec3 fViewer;

void main() {
 vec3 L = normalize(fLight);
 vec3 V = normalize(fViewer);
 vec3 N = normalize(fNormal);
 vec3 H = normalize(L+V);
 float diffuseFactor = max( dot(L,N), 0.0 );
 vec3 diffuse = diffuseFactor * diffuseColor;
 float specularFactor = pow(max(dot(N,H), 0.0), shininess);
 vec3 specular = specularFactor * specularColor;
 if( dot(L,N) < 0.0 ) {
 specular = vec3(0.0, 0.0, 0.0);
 }
 gl_FragColor = vec4(ambientColor + diffuse + specular, 1.0);
}