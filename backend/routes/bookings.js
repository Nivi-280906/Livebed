import express from "express";
import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import Hospital from "../models/Hospital.js";

const router = express.Router();

/* =========================================================
   HELPER
   Convert time slot strings such as:

   "09:00–12:00"
   "10:00 - 11:00"
   "09:00–10:00"

   into start/end
========================================================= */
function parseTimeSlot(slot) {
  if (!slot) {
    return null;
  }

  const text = String(slot)
    .trim()
    .replace(/-/g, "–");

  const parts = text
    .split("–")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length !== 2) {
    return null;
  }

  return {
    start: parts[0],
    end: parts[1],
  };
}

/* =========================================================
   CREATE BOOKING
========================================================= */
router.post("/", async (req, res) => {
  const session =
    await mongoose.startSession();

  try {
    session.startTransaction();

    const {
      patientUid,
      patientName,
      patientAge,
      patientGender,
      patientPhone,
      patientVillage,
      relation,
      bookedByName,
      symptom,
      hospitalId,
      department,
      appointmentDate,
      appointmentStart,
      appointmentEnd,
      source = "online",
    } = req.body;

    /* -----------------------------------------------------
       BASIC VALIDATION

       Both online and walk-in bookings now always supply a
       real, hospital/patient-picked appointmentStart/End —
       walk-ins just default appointmentDate to today on the
       frontend since there's no date picker for "right now".
    ----------------------------------------------------- */

    if (!patientUid) {
      throw new Error(
        "Patient information is missing"
      );
    }

    if (!hospitalId) {
      throw new Error(
        "Hospital is required"
      );
    }

    if (!department) {
      throw new Error(
        "Department is required"
      );
    }

    if (!appointmentDate) {
      throw new Error(
        "Please select an appointment date"
      );
    }

    if (!appointmentStart || !appointmentEnd) {
      throw new Error(
        "Please select an appointment time slot"
      );
    }

    /* -----------------------------------------------------
       FIND HOSPITAL
    ----------------------------------------------------- */

    const hospital =
      await Hospital.findById(
        hospitalId
      ).session(session);

    if (!hospital) {
      throw new Error(
        "Hospital not found"
      );
    }

    /* -----------------------------------------------------
       FIND DEPARTMENT
    ----------------------------------------------------- */

    const dept =
      hospital.departments.find(
        (d) => d.name === department
      );

    if (!dept) {
      throw new Error(
        "Department not found"
      );
    }

    /* -----------------------------------------------------
       CAPACITY CHECK
    ----------------------------------------------------- */

    if (
      dept.status === "full" ||
      dept.booked >= dept.capacity
    ) {
      throw new Error(
        "This department is full — pick another hospital"
      );
    }

    /* -----------------------------------------------------
       RESOLVE THE REAL APPOINTMENT SLOT

       Both online and walk-in bookings must match one of this
       department's real published timeSlots — the walk-in form
       now offers the same dropdown an online patient sees, so
       there's exactly one source of truth for valid slots.
    ----------------------------------------------------- */

    const availableSlots =
      Array.isArray(dept.timeSlots)
        ? dept.timeSlots
        : [];

    const selectedSlot =
      availableSlots.find((slot) => {
        const parsed =
          parseTimeSlot(slot);

        if (!parsed) {
          return false;
        }

        return (
          parsed.start ===
            appointmentStart &&
          parsed.end ===
            appointmentEnd
        );
      });

    if (!selectedSlot) {
      throw new Error(
        "The selected time slot is not available at this hospital"
      );
    }

    const selectedDate =
      new Date(appointmentDate);

    if (
      Number.isNaN(
        selectedDate.getTime()
      )
    ) {
      throw new Error(
        "Invalid appointment date"
      );
    }

    const finalAppointmentDate = selectedDate;
    const finalAppointmentStart = appointmentStart;
    const finalAppointmentEnd = appointmentEnd;

    /* -----------------------------------------------------
       CAPACITY UPDATE
    ----------------------------------------------------- */

    dept.booked += 1;

    if (
      dept.booked >=
      dept.capacity
    ) {
      dept.status = "full";
    }

    await hospital.save({
      session,
    });

    /* -----------------------------------------------------
       CREATE BOOKING
    ----------------------------------------------------- */

    const booking =
      await Booking.create(
        [
          {
            patientUid,

            patientName,

            patientAge:
              patientAge ?? null,

            patientGender:
              patientGender || "",

            patientPhone:
              patientPhone || "",

            patientVillage:
              patientVillage || "",

            relation:
              relation || "Self",

            bookedByName:
              bookedByName || "",

            symptom:
              symptom || "",

            hospitalId,

            department,

            /* REAL DATA — online: patient-picked slot.
               walk-in: real now -> now+consult-time slot. */
            appointmentDate:
              finalAppointmentDate,

            appointmentStart:
              finalAppointmentStart,

            appointmentEnd:
              finalAppointmentEnd,

            estimatedWaitMinutes:
              dept.avgConsultMinutes,

            source,

            status: "waiting",
          },
        ],
        {
          session,
        }
      );

    await session.commitTransaction();

    res.status(201).json(
      booking[0]
    );
  } catch (err) {
    await session.abortTransaction();

    res.status(400).json({
      error: err.message,
    });
  } finally {
    session.endSession();
  }
});

/* =========================================================
   PATIENT BOOKING HISTORY
========================================================= */

router.get(
  "/patient/:uid",
  async (req, res) => {
    try {
      const bookings =
        await Booking.find({
          patientUid:
            req.params.uid,
        })
          .populate(
            "hospitalId",
            "name area"
          )
          .sort({
            createdAt: -1,
          });

      res.json(bookings);
    } catch (err) {
      res.status(500).json({
        error: err.message,
      });
    }
  }
);

/* =========================================================
   HOSPITAL BOOKINGS
========================================================= */

router.get(
  "/hospital/:hospitalId",
  async (req, res) => {
    try {
      const bookings =
        await Booking.find({
          hospitalId:
            req.params.hospitalId,
        }).sort({
          createdAt: -1,
        });

      res.json(bookings);
    } catch (err) {
      res.status(500).json({
        error: err.message,
      });
    }
  }
);

/* =========================================================
   UPDATE BOOKING STATUS
========================================================= */

router.patch(
  "/:id/status",
  async (req, res) => {
    const session =
      await mongoose.startSession();

    try {
      session.startTransaction();

      const { status } =
        req.body;

      const allowedStatuses = [
        "waiting",
        "in-progress",
        "completed",
        "no-show",
        "cancelled",
      ];

      if (
        !allowedStatuses.includes(
          status
        )
      ) {
        throw new Error(
          "Invalid booking status"
        );
      }

      const booking =
        await Booking.findById(
          req.params.id
        ).session(session);

      if (!booking) {
        throw new Error(
          "Booking not found"
        );
      }

      if (
        booking.status !==
        "waiting"
      ) {
        throw new Error(
          `This booking is already ${booking.status} and can't be changed`
        );
      }

      const freesSlot =
        [
          "completed",
          "no-show",
          "cancelled",
        ].includes(status);

      booking.status =
        status;

      await booking.save({
        session,
      });

      if (freesSlot) {
        const hospital =
          await Hospital.findById(
            booking.hospitalId
          ).session(session);

        if (hospital) {
          const dept =
            hospital.departments.find(
              (d) =>
                d.name ===
                booking.department
            );

          if (dept) {
            dept.booked =
              Math.max(
                0,
                dept.booked - 1
              );

            dept.status =
              dept.booked >=
              dept.capacity
                ? "full"
                : "open";

            await hospital.save({
              session,
            });
          }
        }
      }

      await session.commitTransaction();

      res.json(booking);
    } catch (err) {
      await session.abortTransaction();

      res.status(400).json({
        error: err.message,
      });
    } finally {
      session.endSession();
    }
  }
);

export default router;