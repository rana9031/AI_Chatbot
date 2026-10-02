import os
import time
import tempfile

from dotenv import load_dotenv
from google import genai
from google.genai import types


# ================= ENVIRONMENT =================

load_dotenv()

client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)


# ================= AI RESPONSE =================

def get_ai_response(message, uploaded_file=None):

    # ==================================================
    # FILE / IMAGE
    # ==================================================

    if uploaded_file:

        file_data = uploaded_file.read()

        mime_type = uploaded_file.content_type or ""

        prompt = message.strip() if message else ""

        # Default image/file instruction
        if not prompt:

            prompt = (
                "Carefully analyze the uploaded file. "
                "Describe only what is actually present. "
                "Do not guess or invent information."
            )


        # ==================================================
        # IMAGE ANALYSIS
        # ==================================================

        if mime_type.startswith("image/"):

            image_prompt = (
                "Analyze this image carefully.\n\n"
                "Follow these rules:\n"
                "1. Describe only what is actually visible.\n"
                "2. Read any visible printed or handwritten text carefully.\n"
                "3. If text is present, reproduce the text as accurately as possible.\n"
                "4. Do not invent text that is not visible.\n"
                "5. If handwriting is unclear, clearly say that it is unclear instead of guessing.\n"
                "6. Answer the user's question directly.\n\n"
                f"User's request:\n{prompt}"
            )

            try:

                response = client.models.generate_content(
                    model="gemini-3.8-flash",
                    contents=[
                        types.Part.from_bytes(
                            data=file_data,
                            mime_type=mime_type
                        ),
                        image_prompt
                    ]
                )

                if response.text:
                    return response.text

                return "I could not understand the image clearly."


            except Exception as e:

                raise e


        # ==================================================
        # OTHER FILES
        # ==================================================

        temp_path = None

        try:

            suffix = os.path.splitext(
                uploaded_file.name
            )[1]


            with tempfile.NamedTemporaryFile(
                delete=False,
                suffix=suffix
            ) as temp_file:

                temp_file.write(file_data)

                temp_path = temp_file.name


            # Upload file to Gemini

            gemini_file = client.files.upload(
                file=temp_path
            )


            response = client.models.generate_content(
                model="gemini-3.8-flash",
                contents=[
                    gemini_file,
                    prompt
                ]
            )


            if response.text:
                return response.text

            return "I could not analyze this file."


        finally:

            if temp_path and os.path.exists(temp_path):

                os.remove(temp_path)


    # ==================================================
    # NORMAL TEXT CHAT
    # ==================================================

    models = [
        "gemini-3.8-flash",
        "gemini-3-flash-preview",
    ]

    last_error = None


    for model in models:

        for attempt in range(3):

            try:

                response = client.models.generate_content(
                    model=model,
                    contents=message
                )


                if response.text:

                    return response.text


                return "I could not generate a response."


            except Exception as e:

                last_error = e

                print(
                    f"AI ERROR ({model}, attempt {attempt + 1}):",
                    repr(e)
                )

                time.sleep(2)


    # ==================================================
    # FINAL ERROR
    # ==================================================

    if last_error:

        raise last_error

    raise Exception(
        "Unable to get a response from AI."
    )