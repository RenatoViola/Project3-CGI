const int MAX_LIGHTS = 8;

attribute vec4 vPosition; // vertex position in modelling coordinates
attribute vec4 vNormal; // vertex normal in modelling coordinates

uniform mat4 mModelView; // model-view transformation
uniform mat4 mNormals; // model-view transformation for normals

uniform mat4 mView; // view transformation (for points)
uniform mat4 mViewNormals; // view transformation (for vectors)

uniform mat4 mProjection; // projection matrix

uniform vec4 lightPositions[MAX_LIGHTS];

varying vec3 fNormal; // normal vector in camera space
varying vec3 fLight; // Light vector in camera space
varying vec3 fViewer; // View vector in camera space

void main(){
 // compute position in camera frame
 vec3 posC = (mModelView * vPosition).xyz;

 // compute normal in camera frame
 fNormal = (mNormals * vNormal).xyz;

 // compute light vector in camera frame
 if(lightPositions[0].w == 0.0)
    fLight = normalize((mViewNormals * lightPositions[0]).xyz);
 else
    fLight = normalize((mView*lightPositions[0]).xyz - posC);

 // Compute the view vector
  fViewer = -posC; // Perspective projection
 //fViewer = vec3(0,0,1); // Parallel projection only
 // Compute vertex position in clip coordinates (as usual)
 gl_Position = mProjection * mModelView * vPosition;
}