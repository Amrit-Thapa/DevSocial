const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const Profile = require("../../models/Profile");
const User = require("../../models/User");
const { check, validationResult } = require("express-validator");
const normalize = require("normalize-url");
const checkObjectId = require("../../middleware/checkObjectId");
const config = require("config");
const axios = require("axios");

// @route  GET api/profile/me
// @desc   Get current user profile route
// @access Private
router.get("/me", auth, async (req, res) => {
  try {
    const profile = await Profile.findOne({
      user: req.user.id,
    }).populate("user", ["name", "avatar"]);

    if (!profile) {
      return res.status(400).json({ msg: "There is no Profile for this user" });
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server Error");
  }
});

// @route  POST api/profile
// @desc   Create or Update user Profile
// @access Private
router.post(
  "/",
  [
    auth,
    [
      check("status", "Status is required").not().isEmpty(),
      check("skills", "skills is required").not().isEmpty(),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // destructure the request
    const {
      website,
      skills,
      youtube,
      twitter,
      instagram,
      linkedin,
      facebook,
      // spread the rest of the fields we don't need to check
      ...rest
    } = req.body;

    // build a profile
    const profileFields = {
      user: req.user.id,
      website:
        website && website !== ""
          ? normalize(website, { forceHttps: true })
          : "",
      skills: Array.isArray(skills)
        ? skills
        : skills.split(",").map((skill) => " " + skill.trim()),
      ...rest,
    };

    // Build socialFields object
    const socialFields = { youtube, twitter, instagram, linkedin, facebook };
    for (const [key, value] of Object.entries(socialFields)) {
      if (value && value.length > 0)
        socialFields[key] = normalize(value, { forceHttps: true });
    }
    // add to profileFields
    profileFields.social = socialFields;

    try {
      // Using upsert option (creates new doc if no match is found):
      let profile = await Profile.findOneAndUpdate(
        { user: req.user.id },
        { $set: profileFields },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
          useFindAndModify: false,
        }
      );
      return res.json(profile);
    } catch (err) {
      console.error(err.message);
      return res.status(500).send("Server Error");
    }
  }
);

// @route  GET api/profile
// @desc   Get All user Profile
// @access Public
router.get("/", async (req, res) => {
  try {
    const profile = await Profile.find().populate("user", ["name", "avatar"]);
    return res.json(profile);
  } catch (error) {
    console.error(error.message);
    return res.status(500).send("Server Error..!!");
  }
});

// @route  GET api/profile/user/:user
// @desc   Get user Profile by id
// @access Private
router.get(
  "/user/:user_id",
  checkObjectId("user_id"),
  async ({ params: { user_id } }, res) => {
    try {
      const profile = await Profile.findOne({
        user: user_id,
      }).populate("user", ["name", "avatar"]);

      if (!profile) {
        return res.status(400).json({ msg: "Profile not found" });
      }
      return res.json(profile);
    } catch (error) {
      console.error(error.message);

      if ((error.kind = "ObjectID")) {
        return res.status(400).json({ msg: "Profile not found" });
      }
      return res.status(500).send("Server Error..!!");
    }
  }
);

// @route  Delete api/profile
// @desc   Delete user Profile by id
// @access Private
router.delete("/", auth, async (req, res) => {
  try {
    // @todo - remove users posts
    // Remove  profile
    await Profile.findOneAndRemove(
      { user: req.user.id },
      { useFindAndModify: false }
    );

    // Remove user
    await User.findOneAndRemove(
      { _id: req.user.id },
      { useFindAndModify: false }
    );

    return res.json({ msg: " User Deleted..!!" });
  } catch (error) {
    console.error(error.message);
    return res.status(500).send("Server Error..!!");
  }
});

// @route  PUT api/profile/experience
// @desc   Add Profile Experience
// @access Private
router.put(
  "/experience",
  auth,
  [
    check("title", "Title is required").notEmpty(),
    check("company", "Company is required").notEmpty(),
    check("from", "From date is required and needs to be from the past")
      .notEmpty()
      .custom((value, { req }) => (req.body.to ? value < req.body.to : true)),
  ],
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const profile = await Profile.findOne({ user: req.user.id });

      profile.experience.unshift(req.body);

      await profile.save();

      res.json(profile);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server Error");
    }
  }
);

// @route  Delete api/profile/experience/:exp_id
// @desc   Delete Profile Experience
// @access Private
router.delete(
  "/experience/:exp_id",
  auth,
  checkObjectId("exp_id"),
  async (req, res) => {
    try {
      const foundProfile = await Profile.findOne({ user: req.user.id });

      foundProfile.experience = foundProfile.experience.filter(
        (exp) => exp._id.toString() !== req.params.exp_id
      );

      await foundProfile.save();
      return res.status(200).json(foundProfile);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server Error");
    }
  }
);

// @route    PUT api/profile/education
// @desc     Add profile education
// @access   Private
router.put(
  "/education",
  auth,
  check("school", "School is required").notEmpty(),
  check("degree", "Degree is required").notEmpty(),
  check("fieldofstudy", "Field of study is required").notEmpty(),
  check("from", "From date is required and needs to be from the past")
    .notEmpty()
    .custom((value, { req }) => (req.body.to ? value < req.body.to : true)),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const profile = await Profile.findOne({ user: req.user.id });

      profile.education.unshift(req.body);

      await profile.save();

      res.json(profile);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server Error");
    }
  }
);

// @route    DELETE api/profile/education/:edu_id
// @desc     Delete education from profile
// @access   Private

router.delete("/education/:edu_id", auth, async (req, res) => {
  try {
    const foundProfile = await Profile.findOne({ user: req.user.id });
    foundProfile.education = foundProfile.education.filter(
      (edu) => edu._id.toString() !== req.params.edu_id
    );
    await foundProfile.save();
    return res.status(200).json(foundProfile);
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ msg: "Server error" });
  }
});

// @route    GET api/profile/github/:username
// @desc     Get Users Repos from github
// @access   Public
router.get("/github/:username", async (req, res) => {
  try {
    // creating url
    const url = encodeURI(
      `https://api.github.com/users/${req.params.username}/repos?per_page=5&sort=created:asc`
    );

    // creating headers
    const headers = {
      headers: { "user-agent": "node.js" },
      Authorization: `token ${config.get("githubToken")}`,
    };

    const githuResponse = await axios.get(url, { headers });

    return res.json(githuResponse.data);
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
