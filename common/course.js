var _ = require("underscore")
    , _str = require("underscore.string")
    , path = require('path')
    , uuid = require('node-uuid')
    , fs = require("fs")
_.mixin(_str.exports());

var MATERIAL_FILEDS_LECTURE = ["body", "title"]
    , MATERIAL_FILEDS_PROBLEM = ["body", "title", "explanation", "hint"]
    , MATERIAL_FILEDS_CHOICE = ["body"]
    , PROBLEM_WITH_CHOICES = ["singlechoice", "multichoice"];

var convertMaterialObject = function (target, fields, materials) {
    _.each(fields, function (field) {
        if (!target[field]) {
            return;
        }
        _.each(materials, function (material, name) {
            target[field] = target[field].replace(name, material.id);
        });
    });
}

var refineMaterialId = function (chapter) {
    _.each(chapter.lessons, function (lesson) {
        _.each(lesson.activities, function (activity) {
            if ("quiz" === activity.type) {
                _.each(activity.problems, function (problem) {
                    // replace all materials in every problem
                    // fields need to note: body, title, explanation, hint, choices
                    convertMaterialObject(problem, MATERIAL_FILEDS_PROBLEM, lesson.materials);
                    if (_.contains(PROBLEM_WITH_CHOICES, problem.type)) {
                        _.each(problem.choices, function (choice) {
                            convertMaterialObject(choice, MATERIAL_FILEDS_CHOICE, lesson.materials);
                        })
                    }
                });
            } else if ("lecture" === activity.type) {
                // replace all materials in lecture
                convertMaterialObject(activity, MATERIAL_FILEDS_LECTURE, lesson.materials);
            }
        });
    });
    return chapter;
}

exports.parseChapter = function (chapterFolder) {
    var lessonFolders = fs.readdirSync(chapterFolder)
        , chapter = {}
        , lessonsMap = {};
    chapter.lessons = [];
    chapter.id = uuid.v4();
    var fileName = path.basename(chapterFolder);
    console.log('chapterFolder,%s', fileName);
    chapter.name = fileName;
    chapter.title = fileName;

    _.each(lessonFolders, function (lessonFolder) {
        if (_.startsWith(lessonFolder, ".")) {
            return;
        }
        var lesson = exports.parseLesson(chapterFolder, lessonFolder);
        chapter.lessons.push(lesson);
        lessonsMap[lessonFolder] = lesson;
        console.log("put a lesson," + lessonFolder);
    });

    // change all lesson requirements
    _.each(chapter.lessons, function (lesson) {
        console.log("lesson requirement," + lesson.requirements);
        if (typeof lesson.requirements != "undefined") {
            lesson.requirements = _.map(lesson.requirements, function (requirement) {
                var requiredLesson = lessonsMap[requirement];
                if (typeof requiredLesson === "undefined") {
                    throw "required lesson not exists," + lesson.title + "," + lesson.folder_name + "," + requirement;
                }
                return requiredLesson.id;
            });
        } else if (typeof lesson.requirements === "undefined") {
            chapter.enter_lesson = lesson.id;
            console.log('found enter lesson,%s', lesson.id);
        }
    });
    return refineMaterialId(chapter);
};

exports.parseLesson = function (chapterFolder, lessonFolder) {
    console.log("convert folder," + lessonFolder);
    var folder = path.join(chapterFolder, lessonFolder);
    var lesson = {};
    var lessonManifest = path.join(folder, "lesson.txt");
    // read lesson.txt
    var data = fs.readFileSync(lessonManifest, "utf8");
    data = data.replace(/^\uFEFF/, '');

    lesson = JSON.parse(data);
    lesson.id = uuid.v4();
    lesson.activities = [];
    lesson.folder_name = lessonFolder;
    if (typeof lesson.requirements != "undefined") {
        if (lesson.requirements.length == 0) {
            lesson.requirements = undefined;
        }
    }
    // find activities and materials folders
    var activityFolder = path.join(folder, "活动");
    var materialFolder = path.join(folder, "素材");
    var materials = {};
    var activitiesNameMap = {};
    if (!fs.existsSync(activityFolder)) {
        activityFolder = path.join(folder, "activities");
        if (!fs.existsSync(activityFolder)) {
            activityFolder = undefined;
        }
    }
    if (!fs.existsSync(materialFolder)) {
        materialFolder = path.join(folder, "materials");
        if (!fs.existsSync(materialFolder)) {
            materialFolder = undefined;
        }
    }
    if (typeof  activityFolder === "undefined" || typeof  materialFolder === "undefined") {
        return;
    }

    // Read materials
    var materialFiles = fs.readdirSync(materialFolder);
    _.each(materialFiles, function (material) {
        if (_(material).startsWith('.')) {
            return;
        }
        materials[material] = {
            id: uuid.v4(),
            local_path: path.join(materialFolder, material)
        };
        if (_(material).endsWith('.pdf')) {
            materials[material].id = materials[material].id + '.pdf';
        } else if (_(material).endsWith('.mp3')) {
            materials[material].id = materials[material].id + '.mp3';
        }
    })
    lesson.materials = materials;

    // Read activities
    var files = fs.readdirSync(activityFolder);
    files.sort(function (a, b) {
        return parseInt(a.split('.')[0]) - parseInt(b.split('.')[0]);
    });
    _.each(files, function (file) {
        console.log("activity:" + file);
        if (_.startsWith(file, ".")) {
            return;
        }
        var data = fs.readFileSync(path.join(activityFolder, file, "activity.txt"), "utf8");
        data = data.replace(/^\uFEFF/, '');

        var activity = JSON.parse(data);
        activity.id = uuid.v4();
        activity.parent_id = lesson.id;
        activity.folder_name = _.trim(_.strRight(file, '.'));
        activitiesNameMap[activity.folder_name] = activity;
        activity.problems = [];
        lesson.activities.push(activity);

        files.sort(function (a, b) {
            return parseInt(a.split('.')[0]) - parseInt(b.split('.')[0]);
        });
        if ("quiz" == activity.type) {
            var problems = fs.readdirSync(path.join(activityFolder, file, "problems"));
            problems.sort(function (a, b) {
                return parseInt(a.split('.')[0]) - parseInt(b.split('.')[0]);
            });
            _.each(problems, function (problem) {
                if (_.startsWith(problem, ".")) {
                    return;
                }
                console.log("problem:%s,%s,%s", folder, file, problem);
                var data = fs.readFileSync(path.join(activityFolder, file, "problems", problem), "utf8");
                data = data.replace(/^\uFEFF/, '');
                var problem = JSON.parse(data);
                problem.parent_id = activity.id;
                problem.id = uuid.v4();
                activity.problems.push(problem);
                _.each(problem.choices, function (choice) {
                    choice.id = uuid.v4();
                })
            });
        }
    });

    _.each(lesson.activities, function (activity) {
        activity.jump = _.map(activity.jump, function (j) {
            if (_.startsWith(j, "to_activity_if_correctness:")) {
                var jumpParts = _.words(j, ":");
                var jumpToActivity = jumpParts[1];
                var targetActivity = activitiesNameMap[jumpToActivity];
                if (typeof targetActivity === "undefined") {
                    jumpToActivity = _.strRight(jumpToActivity, ".");
                    targetActivity = activitiesNameMap[jumpToActivity];
                }
                if (typeof targetActivity === "undefined") {
                    throw "this activity not exists," + jumpToActivity + "," + JSON.stringify(activity);
                } else {
                    j = "to_activity_if_correctness:" + targetActivity.id + ":" + jumpParts[2];
                }
            }
            return j;
        });
        if (activity.jump.length == 0) {
            activity.jump = undefined;
        }
        activity.folder_name = undefined;
    })
    return lesson;
};


exports.exportChapter = function (subject, chapter, exportFolder) {
    var chapterFolder = path.join(exportFolder, chapter.id);
    if (!fs.existsSync(exportFolder)) {
        fs.mkdirSync(exportFolder);
    }
    if (!fs.existsSync(chapterFolder)) {
        fs.mkdirSync(chapterFolder);
    }
    var exportChapterManifest = {};
    var chapterManifest = path.join(chapterFolder, "manifest.json");
    exportChapterManifest.id = chapter.id;
    exportChapterManifest.name = chapter.name;
    exportChapterManifest.package_name = "org.sunlib.exercise";
    exportChapterManifest.version_code = 0;
    exportChapterManifest.enter_lesson = chapter.enter_lesson;
    exportChapterManifest.launchable = 0;
    exportChapterManifest.url = "/app/" + exportChapterManifest.id;
    exportChapterManifest.type = "chapter";
    exportChapterManifest.subject = subject;
    exportChapterManifest.lessons = [];
    exportChapterManifest.grade = 0;
    exportChapterManifest.title = chapter.name;
    exportChapterManifest.ts = new Date().getTime();
    _.each(chapter.lessons, function (lesson) {
        exportChapterManifest.lessons.push({
            id: lesson.id,
            ts: lesson.ts,
            title: lesson.title,
            summary: lesson.summary,
            requirements: lesson.requirements
        });
        var lessonFolder = path.join(chapterFolder, lesson.id);
        var lessonJsonFile = path.join(lessonFolder, "lesson.json");
        if (!fs.existsSync(lessonFolder)) {
            fs.mkdirSync(lessonFolder);
            fs.writeFileSync(lessonJsonFile, JSON.stringify(lesson));
            _.each(lesson.materials, function (material, name) {
                console.log("ready to move material," +
                    material.local_path + "," +
                    path.join(lessonFolder, name));
                fs.createReadStream(material.local_path)
                    .pipe(fs.createWriteStream(path.join(lessonFolder, material.id)));
            });
            delete lesson.materials;
        }
    });
    fs.writeFileSync(chapterManifest, JSON.stringify(exportChapterManifest));
}
