
/*

1. Import Sentinel-1 GRDH data
2. Create a False color compisite R:VV, G:VH, B:VH-VV
3. Create a GIF animation of the timeseries

Author:Narayanarao Bhogapurapu
Web:https://Narayana-Rao.github.io

*/

var roi =   ee.Geometry.Polygon(
        [[[72.64246731614605, 19.22012780213227],
          [72.64246731614605, 18.818948051385817],
          [73.03110867356793, 18.818948051385817],
          [73.03110867356793, 19.22012780213227]]], null, false);

var sentinel1 = ee.ImageCollection('COPERNICUS/S1_GRD')
                  .filterBounds(roi)
                  .filterDate('2020-01-01', '2020-12-31') 
                  .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
                  .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'))
                  .filter(ee.Filter.eq('instrumentMode', 'IW'))
                  .filter(ee.Filter.eq('orbitProperties_pass', 'DESCENDING')); // Choose ascending or descending pass



// Function to create an RGB image for each image in the collection
var createRGB = function(image) {
  // Compute the VH - VV difference
  var vh_vv_diff = image.select('VH').subtract(image.select('VV')).rename('VH_VV_diff');
  
  // Stack VV, VH, and VH-VV difference into one image
  var rgb = image.addBands(vh_vv_diff);
  
  // Define visualization parameters
  var visParams = {
    min: -15, 
    max: 10, 
    bands: ['VV', 'VH', 'VH_VV_diff'],
    gamma: 1.5
  };
  
  // Visualize the image using the defined parameters
  var imageWithText = rgb.visualize(visParams);
  
  // Clip the image to the region of interest (geometry)
  return imageWithText.clip(roi);
};

// Apply the function to the image collection
var rgbCollection = sentinel1.map(createRGB);

// Create a GIF using the RGB images
var gifParams = {
  'dimensions': 600, // Set the resolution of the GIF
  'region': roi, // Define the region to include in the GIF
  'framesPerSecond': 2, // Adjust the frame rate (images per second)
  'crs': 'EPSG:4326' // Set the coordinate reference system (WGS84)
};

// Export the GIF as a URL
var gifUrl = rgbCollection.getVideoThumbURL(gifParams);

// Print the URL to the console to download the GIF
print('GIF URL:', gifUrl);
