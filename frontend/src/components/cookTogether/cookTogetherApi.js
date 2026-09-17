// src/components/cookTogether/cookTogetherApi.js

import api from "../../api";


// ============================================================
// FORMAT API ERRORS
// ============================================================

function apiError(error, fallbackMessage) {
  const status = error?.response?.status;
  const data = error?.response?.data;

  if (typeof data?.detail === "string") {
    return new Error(data.detail);
  }

  if (data && typeof data === "object") {
    const message = Object.entries(data)
      .map(([field, errors]) => {
        const value = Array.isArray(errors)
          ? errors.join(", ")
          : String(errors);

        return `${field}: ${value}`;
      })
      .join(" ");

    if (message) {
      return new Error(message);
    }
  }

  if (status === 401) {
    return new Error(
      "Your login session has expired. Please log out and log in again."
    );
  }

  if (status === 403) {
    return new Error(
      "You do not have permission to perform this action."
    );
  }

  if (status === 404) {
    return new Error(
      "The Cook Together API URL was not found."
    );
  }

  return new Error(
    error?.message || fallbackMessage
  );
}


// ============================================================
// CREATE OR UPDATE COOK TOGETHER
// ============================================================

export async function saveCookTogether(
  payload,
  id = null
) {
  try {
    let response;

    if (id) {
      response = await api.patch(
        `/cook-togethers/${id}/`,
        payload
      );
    } else {
      response = await api.post(
        "/cook-togethers/",
        payload
      );
    }

    return response.data;
  } catch (error) {
    throw apiError(
      error,
      "Could not save the Cook Together."
    );
  }
}


// ============================================================
// PUBLISH COOK TOGETHER
// ============================================================

export async function publishCookTogether(id) {
  if (!id) {
    throw new Error(
      "Save the Cook Together before publishing."
    );
  }

  try {
    const response = await api.post(
      `/cook-togethers/${id}/publish/`
    );

    return response.data;
  } catch (error) {
    throw apiError(
      error,
      "Could not publish the Cook Together."
    );
  }
}


// ============================================================
// GET ALL COOK TOGETHER INVITES
// ============================================================

export async function getCookTogethers() {
  try {
    const response = await api.get(
      "/cook-togethers/"
    );

    return response.data;
  } catch (error) {
    throw apiError(
      error,
      "Could not load Cook Together invites."
    );
  }
}


// ============================================================
// GET ONE COOK TOGETHER
// ============================================================

export async function getCookTogether(id) {
  if (!id) {
    throw new Error(
      "Cook Together ID is required."
    );
  }

  try {
    const response = await api.get(
      `/cook-togethers/${id}/`
    );

    return response.data;
  } catch (error) {
    throw apiError(
      error,
      "Could not load the Cook Together."
    );
  }
}


// ============================================================
// REQUEST TO JOIN
// ============================================================

export async function requestToJoinCookTogether(
  id,
  note = ""
) {
  if (!id) {
    throw new Error(
      "Cook Together ID is required."
    );
  }

  try {
    const response = await api.post(
      `/cook-togethers/${id}/request_to_join/`,
      {
        note,
      }
    );

    return response.data;
  } catch (error) {
    throw apiError(
      error,
      "Could not send the join request."
    );
  }
}


// ============================================================
// APPROVE JOIN REQUEST
// ============================================================

export async function approveJoinRequest(
  requestId
) {
  if (!requestId) {
    throw new Error(
      "Join request ID is required."
    );
  }

  try {
    const response = await api.post(
      `/cook-together-requests/${requestId}/approve/`
    );

    return response.data;
  } catch (error) {
    throw apiError(
      error,
      "Could not approve the join request."
    );
  }
}


// ============================================================
// DECLINE JOIN REQUEST
// ============================================================

export async function declineJoinRequest(
  requestId
) {
  if (!requestId) {
    throw new Error(
      "Join request ID is required."
    );
  }

  try {
    const response = await api.post(
      `/cook-together-requests/${requestId}/decline/`
    );

    return response.data;
  } catch (error) {
    throw apiError(
      error,
      "Could not decline the join request."
    );
  }
}

export async function searchFoodKindlMembers(
  query = ""
) {
  try {
    const response = await api.get(
      "/members/",
      {
        params: {
          q: query.trim(),
        },
      }
    );

    const members =
      response.data?.results ||
      response.data ||
      [];

    return Array.isArray(members)
      ? members.filter(
          (member) =>
            member?.profile?.account_type !==
              "partner" &&
            member?.account_type !== "partner"
        )
      : [];
  } catch (error) {
    throw apiError(
      error,
      "Could not load FoodKindl members."
    );
  }
}