<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\SupportIntake;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class IntakeController extends Controller
{
    public function index(Request $request): Response
    {
        $search = $request->string('search')->toString();

        $intakes = SupportIntake::query()
            ->with(['conversation.customer:id,name,phone'])
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('phone', 'like', "%{$search}%")
                        ->orWhere('issue', 'like', "%{$search}%")
                        ->orWhereHas('conversation.customer', function ($customerQuery) use ($search) {
                            $customerQuery->where('name', 'like', "%{$search}%")
                                ->orWhere('phone', 'like', "%{$search}%");
                        });
                });
            })
            ->orderByDesc('created_at')
            ->paginate(20)
            ->withQueryString()
            ->through(fn (SupportIntake $intake) => [
                'id' => $intake->id,
                'phone' => $intake->phone,
                'data_size' => $intake->data_size,
                'issue' => $intake->issue,
                'created_at' => optional($intake->created_at)?->toIso8601String(),
                'conversation_id' => $intake->conversation_id,
                'customer' => $intake->conversation?->customer
                    ? [
                        'id' => $intake->conversation->customer->id,
                        'name' => $intake->conversation->customer->name,
                        'phone' => $intake->conversation->customer->phone,
                    ]
                    : null,
            ]);

        return Inertia::render('admin/intakes', [
            'search' => $search,
            'intakes' => $intakes,
        ]);
    }

    public function export(Request $request): StreamedResponse
    {
        $search = $request->string('search')->toString();

        $filename = 'support-intakes-'.now()->format('Y-m-d-His').'.csv';

        return response()->streamDownload(function () use ($search) {
            $handle = fopen('php://output', 'w');

            fputcsv($handle, ['phone', 'data_size', 'main_issue']);

            SupportIntake::query()
                ->when($search !== '', function ($query) use ($search) {
                    $query->where(function ($q) use ($search) {
                        $q->where('phone', 'like', "%{$search}%")
                            ->orWhere('issue', 'like', "%{$search}%")
                            ->orWhereHas('conversation.customer', function ($customerQuery) use ($search) {
                                $customerQuery->where('name', 'like', "%{$search}%")
                                    ->orWhere('phone', 'like', "%{$search}%");
                            });
                    });
                })
                ->orderByDesc('created_at')
                ->chunk(200, function ($rows) use ($handle) {
                    foreach ($rows as $intake) {
                        fputcsv($handle, [
                            $intake->phone,
                            $intake->data_size,
                            $intake->issue,
                        ]);
                    }
                });

            fclose($handle);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }
}
