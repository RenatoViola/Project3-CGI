# CGI Project 3 - Lighting and Materials

## Repository Overview

An interactive WebGL lighting demo developed for Computer Graphics and Interfaces (CGI). A scene of geometric objects and a bunny model demonstrates Phong shading with point, directional, and spot lights, alongside adjustable camera, projection, and material settings.

The project report is available in [relatorio.org](relatorio.org).

---

## Controls

Drag on the canvas to rotate the view. Expand the folders in the control panel to edit their settings, and use lowercase letter shortcuts with focus outside text fields.

| Action | Mouse / Keyboard / Control Panel |
| --- | --- |
| Rotate the view | Click and drag on the canvas |
| Add a point light | `g` |
| Add a directional light and show / hide the control panel | `h` |
| Add a spotlight | `j` |
| Toggle backface culling or depth testing | **Options** folder |
| Adjust field of view and clipping planes | **Perspective** folder |
| Adjust camera position, target, and up vector | **Camera** folder: **eye**, **at**, and **up** |
| Toggle or edit individual lights | **Lights** folder: on/off, position, colours, axis, aperture, and cutoff |
| Change the bunny's material colours and shininess | **Materials** folder |

The scene starts with three lights and supports up to eight. The `h` shortcut also toggles the panel's visibility through the GUI library; press it again to restore a hidden panel. **Open Controls** / **Close Controls** collapses or expands the panel.
