<script setup>
import CuttingAnglesComponent from './components/CuttingAngles.vue'
</script>
# Cutting geometry

## Cutting angles
*Placeholder text provided by LLM*: Cutting angles are fundamental parameters in machining processes, directly influencing tool performance, chip formation, and surface finish. The rake angle (α) determines how easily the material is sheared and affects the direction and flow of chips. A larger rake angle generally reduces cutting forces and improves chip evacuation, but may weaken the cutting edge. The wedge angle (β) defines the robustness of the tool; a larger wedge angle increases tool strength but may increase cutting resistance. The clearance angle (γ) prevents the tool from rubbing against the workpiece, minimizing friction and heat generation, which helps maintain dimensional accuracy and prolongs tool life.

::: tip Interactive
Change the cutting angles using the sliders and observe how the cutting geometry changes. 
<CuttingAnglesComponent />
:::

| Symbol | Name           | Description                                  |
|--------|----------------|----------------------------------------------|
| α      | Rake angle     | Angle between the tool face and the workpiece surface, affects chip flow and cutting forces. |
| β      | Wedge angle    | Angle of the cutting edge itself, determines tool strength and sharpness. |
| γ      | Clearance angle| Angle between the tool flank and the workpiece, prevents rubbing and reduces friction. |