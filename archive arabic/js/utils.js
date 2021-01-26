const SCHEMA = window.location.href.split('://')[0];
const SCHEMA_PORTS = {'http': 80, 'https': 443};
const inAdmin = window.location.pathname.includes('/admin/');
const bounding_box_image = new Image();
bounding_box_image.src = `${inAdmin ? '../images' : 'images'}/pic-z.png`;

function getBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

function base64ToBinary(dataURI) {
    let BASE64_MARKER = ';base64,';
    let base64Index = dataURI.indexOf(BASE64_MARKER) + BASE64_MARKER.length;
    let base64 = dataURI.substring(base64Index);
    let raw = window.atob(base64);
    let rawLength = raw.length;
    let array = new Uint8Array(new ArrayBuffer(rawLength));

    for (let i = 0; i < rawLength; i++) {
        array[i] = raw.charCodeAt(i);
    }
    return array;
}

function file2Binary(file) {
    return new Promise((resolve, reject) => {
        let r = new FileReader();
        r.onload = function () {
            resolve(new Uint8Array(r.result));
        };
        r.readAsArrayBuffer(file);
    })
}

function secondsToClock(seconds) {
    let m = Math.floor(seconds / 60);
    let s = seconds % 60;
    let h = Math.floor(m / 60);
    m = m % 60;

    return toTwoDigits(h) + ':' + toTwoDigits(m) + ':' + toTwoDigits(s);
}

function toTwoDigits(n) {
    return n > 9 ? "" + n : "0" + n;
}

function seekVideoTo(seconds, dom_video) {
    dom_video = (dom_video ? dom_video : document.getElementById('video-show-episode'));
    if (dom_video) {
        $(dom_video).next("canvas").hide();
        $(dom_video).prev(".video-loader").css('display', 'flex');
        dom_video.currentTime = seconds;
        dom_video.pause();
    }
}

function resize_canvas_and_draw_red_box(location_parent_element) {
    const video_element = document.getElementById('video-show-episode');
    const actual_width = video_element.offsetWidth;
    const actual_height = video_element.offsetHeight;
    const original_width = video_element.videoWidth;
    const original_height = video_element.videoHeight;

    const width_ratio = actual_width / original_width;
    const height_ratio = actual_height / original_height;

    const canvas = document.getElementById("canvas-video-cover-show-episode");
    const canvas_jquery = $(canvas);
    canvas_jquery.show();

    const location = $(location_parent_element).find('span').html();
    if (location) {
        const coords_str = location.split(',');
        const coords_num = [];
        coords_str.forEach(function (coord) {
            coords_num.push(parseInt(coord));
        });

        let top, right, bottom, left;
        if (coords_num[1] < coords_num[3]) {
            // left top right bottom
            left = coords_num[0];
            top = coords_num[1];
            right = coords_num[2];
            bottom = coords_num[3];
        } else {
            // top right bottom left
            top = coords_num[0];
            right = coords_num[1];
            bottom = coords_num[2];
            left = coords_num[3];
        }

        canvas_jquery.css('top', top * height_ratio);
        canvas_jquery.css('left', left * height_ratio);

        const width = Math.abs(right - left);
        const height = Math.abs(top - bottom);

        canvas.width = width * width_ratio;
        canvas.height = height * height_ratio;

        const ctx = canvas.getContext("2d");
        ctx.strokeStyle = "red";
        ctx.lineWidth = 5;
        if (currentItemMediaType === 'face')
            ctx.drawImage(bounding_box_image, 0, 0, width * width_ratio, height * height_ratio);
        else
            ctx.rect(0, 0, width * width_ratio, height * height_ratio);

        ctx.stroke();
    }
}

function resetCanvas() {
    const canvas = document.getElementById('canvas-video-cover-show-episode');
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    canvas_already_drawn = true;
}

function bubbleSort(array_of_objects, criterial_field) {
    let swapped;
    do {
        swapped = false;
        for (let i = 0; i < array_of_objects.length - 1; i++) {
            if (parseInt([i][criterial_field]) > parseInt(array_of_objects[i + 1][criterial_field])) {
                let temp = array_of_objects[i];
                array_of_objects[i] = array_of_objects[i + 1];
                array_of_objects[i + 1] = temp;
                swapped = true;
            }
        }
    } while (swapped);
}

function optimizeArrayOfSeconds(array_of_seconds, max_range = 20) {
    let optimized_array_of_seconds = [];
    array_of_seconds = array_of_seconds.sort();
    let start_index = 0;

    while (start_index < array_of_seconds.length) {
        const start_second = array_of_seconds[start_index];
        const current_seconds_run = [start_second];

        let max_range_exceeded = false;
        let i = start_index + 1;
        while (!max_range_exceeded) {
            if (i >= array_of_seconds.length) {
                start_index = i; // Break out of outer loop
                break;
            }

            if (array_of_seconds[i] - array_of_seconds[start_index] > max_range) {
                max_range_exceeded = true;
                start_index = i;
            } else {
                current_seconds_run.push(array_of_seconds[i]);
                i++;
            }

        }

        optimized_array_of_seconds.push(current_seconds_run[0]);
    }

    return optimized_array_of_seconds;
}

function getCurrentSchemaURL(url) {
    // return url.replace(url.split('://')[0], SCHEMA).replace(':80/', ':' + SCHEMA_PORTS[SCHEMA] + '/')
    //     .replace(':443/', ':' + SCHEMA_PORTS[SCHEMA] + '/');
    return url;
}

function dragAndDropSupported() {
    const div = document.createElement('div');
    return (('draggable' in div) || ('ondragstart' in div && 'ondrop' in div) && 'FileReader' in window);
}
