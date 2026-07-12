<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreAssetRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user() && ($this->user()->isAssetManager() || $this->user()->isAdmin());
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        $assetId = $this->route('asset');
        if (is_object($assetId)) {
            $assetId = $assetId->id;
        }

        return [
            'name' => 'required|string|max:255',
            'serial_number' => 'nullable|string|max:255|unique:assets,serial_number' . ($assetId ? ",{$assetId}" : ''),
            'category_id' => 'required|exists:categories,id',
            'acquisition_date' => 'nullable|date',
            'acquisition_cost' => 'nullable|numeric|min:0',
            'condition' => 'required|string|in:Good,Fair,Damaged,Under Maintenance',
            'location' => 'nullable|string|max:255',
            'status' => 'sometimes|required|string|in:Available,Allocated,Under Maintenance',
            'is_bookable' => 'required|boolean',
            'department_id' => 'nullable|exists:departments,id',
            'photo' => 'nullable|image|max:2048', // max 2MB
        ];
    }
}
