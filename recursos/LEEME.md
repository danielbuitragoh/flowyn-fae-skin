# recursos/

Lo que está aquí **no se publica**. `public/` se copia entera al sitio, así que
sólo debe contener lo que de verdad se descarga; todo lo demás vive aquí.

## `originales/`

Los archivos de cámara y de exportación, en PNG y JPG. El sitio sirve WebP
—pesan un 82 % menos y a tamaño real no se distingue la diferencia—, pero un
WebP ya comprimido es un mal punto de partida para volver a exportar. Si hay
que regenerar las imágenes del sitio, se parte de aquí:

```
python3 -c "
from PIL import Image
im = Image.open('recursos/originales/packshot-frasco-recortado.png')
im.save('public/assets/packshot-frasco-recortado.webp', 'WEBP', quality=82, method=6)
"
```

Calidades usadas: 82 para los packshots con transparencia, 88 para la tapa,
78 para las fotografías del ritual.

La miniatura del carrito y de la barra de compra (`frasco-miniatura.webp`,
220 px de ancho) sale del mismo packshot: en esos dos sitios la imagen se pinta
a 34–80 px y no tiene sentido bajar el archivo grande.

## `marca/`

Variantes del logotipo y del isotipo (blanco, oro, PNG y SVG) y fotografías
alternativas que hoy no usa ninguna pantalla. Se guardan porque son de la
marca, no porque el sitio las necesite.

## Lo único que se queda en `public/`

`packshot-frasco-centro.jpg` sigue en JPG a propósito: es la imagen de la vista
previa al compartir el enlace, y los rastreadores de WhatsApp y compañía son
mucho más antiguos que los navegadores — varios todavía no leen WebP.
